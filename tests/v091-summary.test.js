import test from 'node:test'
import assert from 'node:assert/strict'
import { upcomingSummary } from '../src/lib/upcomingSummary.js'
import { cashAfterObligations, prepareData, confirmBillCycle, recordBillPayment } from '../src/lib/finance.js'
import { readFile } from 'node:fs/promises'
import config from '../vite.config.js'

const now=new Date(2026,7,27,12)
const statement=(id,dueDate,more={})=>({id,cardId:'card',dueDate,minimum:50,needsReview:false,...more})
const fixture=(statements=[],payments=[])=>({financeVersion:1,accounts:[{id:'card',name:'Fictional Visa',type:'credit',balance:1000},{id:'bank',name:'Fictional Checking',type:'checking',balance:2000}],cardStatements:statements,payments,bills:[],billCycles:[],billPayments:[],transactions:[],creditScores:[],adjustments:[],extra:0})
const paid=(id,amount=50)=>({id:`payment-${id}`,statementId:id,cardId:'card',bankId:'bank',amount,localDate:'2026-08-25',date:'2026-08-25T12:00:00Z'})

test('one row per card, earliest overdue first, without merging or changing cash calculations',()=>{
  const data=fixture([statement('old','2026-07-15'),statement('current','2026-08-15'),statement('next','2026-09-15')]),before=structuredClone(data),cash=cashAfterObligations(data,now),rows=upcomingSummary(data,now)
  assert.equal(rows.length,1);assert.equal(rows[0].statementId,'old');assert.equal(rows[0].remaining,50)
  assert.equal(rows[0].additionalUnpaidCount,2);assert.equal(rows[0].additionalOverdueCount,1)
  assert.deepEqual(data,before);assert.equal(cashAfterObligations(data,now),cash)
})
test('completed current statement remains through its due date even with a later unpaid statement',()=>{
  const data=fixture([statement('current','2026-08-28'),statement('next','2026-09-28')],[paid('current',100)])
  for(const date of [now,new Date(2026,7,28,23)]){const row=upcomingSummary(data,date)[0];assert.equal(row.statementId,'current');assert.equal(row.remaining,0);assert.equal(row.actualPaid,100)}
  assert.equal(upcomingSummary(data,new Date(2026,7,29,12))[0].statementId,'next')
})
test('overdue unpaid statement takes priority over a paid upcoming statement',()=>{
  const row=upcomingSummary(fixture([statement('old','2026-08-15'),statement('next','2026-09-15')],[paid('next')]),now)[0]
  assert.equal(row.statementId,'old');assert.equal(row.overdue,true)
})
test('no new minimum is invented after the last completed due date',()=>{
  const row=upcomingSummary(fixture([statement('old','2026-08-15')],[paid('old')]),now)[0]
  assert.equal(row.statementNeeded,true);assert.equal(row.remaining,undefined)
  assert.equal(upcomingSummary(fixture(),now)[0].statementNeeded,true)
})
test('unreviewed imported statements remain flagged, never silently removed',()=>{
  const data=fixture([statement('old','2026-08-15',{needsReview:true}),statement('next','2026-09-15',{needsReview:true})],[paid('old')])
  const row=upcomingSummary(data,now)[0];assert.equal(row.statementId,'next');assert.equal(row.needsReview,true);assert.equal(row.reviewCount,2);assert.equal(data.cardStatements.length,2)
})
test('carried-forward statements do not create extra warnings or duplicate rows',()=>{
  const row=upcomingSummary(fixture([statement('old','2026-08-15',{supersededBy:'next'}),statement('next','2026-09-15',{minimum:90})]),now)[0]
  assert.equal(row.statementId,'next');assert.equal(row.additionalUnpaidCount,0);assert.equal(row.required,90)
})
test('a late-month dashboard shows next-month due dates and keeps distinct cards',()=>{
  const data=fixture([statement('next','2026-09-01')]);data.accounts.push({id:'other',name:'Other fictional card',type:'credit',balance:0})
  const rows=upcomingSummary(data,now);assert.equal(rows.length,2);assert.equal(rows[0].dateKey,'2026-09-01');assert.equal(rows[1].statementNeeded,true)
})
test('subscription price change via the actual edit handler preserves older payments and invoice amounts',async()=>{
  let data=fixture();data.bills=[{id:'music',name:'Fictional music subscription',amount:17.99,frequency:'monthly',dueDay:28,nextDueDate:'2026-08-28',accountId:'card',active:true}]
  data.billCycles=[{id:'july',billId:'music',dueDate:'2026-07-28',expectedAmount:17.99,actualAmount:17.99},{id:'august',billId:'music',dueDate:'2026-08-28',expectedAmount:17.99,actualAmount:null}]
  data.billPayments=[{id:'oldcharge',billId:'music',cycleId:'july',bankId:'card',amount:17.99,date:'2026-07-28T12:00:00Z',localDate:'2026-07-28'}]
  const historical=structuredClone({cycle:data.billCycles[0],payment:data.billPayments[0]}),original=structuredClone(data)
  const output=config.plugins[0].transform(await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),'/src/App.jsx'),line=output.split('\n').find(l=>l.startsWith(' const saveBill='))
  const handler=Function('data','form','dateValue','update','setModal','setForm',`${line};return saveBill`)(data,{...data.bills[0],amount:'20.99'},()=> '2026-08-27',next=>{data=prepareData(next,now);return true},()=>{},()=>{})
  handler({preventDefault(){}})
  assert.equal(data.bills[0].amount,20.99);assert.equal(data.billCycles.find(c=>c.id==='august').expectedAmount,17.99)
  data=confirmBillCycle(data,'august',20.99,now)
  data=recordBillPayment(data,{cycleId:'august',bankId:'card',date:'2026-08-27',amount:20.99},now)
  assert.equal(data.accounts[0].balance,1020.99)
  assert.deepEqual(data.billCycles.find(c=>c.id==='july'),historical.cycle)
  assert.deepEqual(data.billPayments.find(p=>p.id==='oldcharge'),historical.payment)
  const later=prepareData(data,new Date(2026,8,1,12));assert.equal(later.billCycles.find(c=>c.dueDate==='2026-09-28').expectedAmount,20.99)
  assert.equal(original.billPayments[0].amount,17.99)
})
