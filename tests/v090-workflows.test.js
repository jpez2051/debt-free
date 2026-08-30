import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import config from '../vite.config.js'
import { prepareData, recordCardPayment, removeCardPayment, statementTotals, recordBillPayment, cycleTotals, confirmBillCycle, trackedObligations, cashAfterObligations, saveStatement, reassignPayment, reconcileAccount, recordRefund, netSpendingEntries, saveLedgerTransaction, removeLedgerTransaction, removeRecurringPayment, nextBillDate, localDate } from '../src/lib/finance.js'
import { createRepository, parseBackup } from '../src/lib/storage.js'
import { validateData } from '../src/lib/backup.js'
import { trendComparison, monthlyTrend } from '../src/lib/reporting.js'

const now=new Date(2026,7,27,12)
const raw=()=>({accounts:[{id:'card',name:'Visa',type:'credit',balance:1000,minimum:50,nextDueDate:'2026-09-15'},{id:'bank',name:'Checking',type:'checking',balance:2000}],transactions:[],payments:[],bills:[],billPayments:[],creditScores:[],strategy:'avalanche',extra:0})
const base=()=>prepareData(raw(),now)
const pay=(data,value,more={})=>recordCardPayment(data,{cardId:'card',bankId:'bank',statementId:data.cardStatements[0].id,date:'2026-08-27',amount:value,...more},now)
const billData=(funding='bank')=>prepareData({...raw(),bills:[{id:'bill',name:'Power',accountId:funding,amount:100,dueDay:28,frequency:'monthly',nextDueDate:'2026-08-28',active:true}]},now)
const billPay=(data,value,more={})=>recordBillPayment(data,{cycleId:data.billCycles[0].id,bankId:'bank',date:'2026-08-27',amount:value,...more},now)
const balance=(data,id)=>data.accounts.find(a=>a.id===id).balance

test('two same-day payments stay on one statement and preserve full actual amount',()=>{
  const data=pay(pay(base(),50),100),s=data.cardStatements[0]
  assert.equal(data.cardStatements.length,1)
  assert.equal(data.accounts[0].nextDueDate,'2026-09-15')
  assert.deepEqual(statementTotals(s,data.payments,now),{required:50,actualPaid:150,paid:50,remaining:0})
  assert.equal(balance(data,'card'),850);assert.equal(balance(data,'bank'),1850)
})
test('minimum is independent of post-payment balance',()=>{
  let data=base();data.accounts[0].balance=120;data.cardStatements[0].minimum=100
  data=pay(data,60)
  assert.equal(balance(data,'card'),60)
  assert.equal(statementTotals(data.cardStatements[0],data.payments,now).remaining,40)
})
test('deleting an earlier payment retains later payments and recomputes statement status',()=>{
  let data=pay(base(),30),first=data.payments[0].id;data=pay(data,40);data=removeCardPayment(data,first,now)
  assert.equal(statementTotals(data.cardStatements[0],data.payments,now).remaining,10)
  assert.equal(balance(data,'card'),960);assert.equal(balance(data,'bank'),1960)
})
test('historical card entries affect statement totals but not balances',()=>{
  const data=pay(base(),50,{historical:true});assert.equal(balance(data,'card'),1000)
  assert.equal(statementTotals(data.cardStatements[0],data.payments,now).remaining,0)
  assert.equal(balance(removeCardPayment(data,data.payments[0].id,now),'bank'),2000)
})
test('future and invalid dated completed activity is rejected',()=>{
  assert.throws(()=>pay(base(),50,{date:'2026-08-28'}),/earlier/)
  assert.throws(()=>pay(base(),50,{date:'2026-02-30'}),/earlier/)
  assert.throws(()=>pay(base(),Infinity),/valid amount/)
  assert.throws(()=>pay(base(),1.001),/two decimal/)
})
test('overpayment records the full amount and a credit balance',()=>{
  const data=pay(base(),1100);assert.equal(balance(data,'card'),-100);assert.equal(balance(data,'bank'),900)
})
test('a new statement is explicit, not inferred from a payment',()=>{
  let data=pay(base(),100);data=saveStatement(data,{cardId:'card',dueDate:'2026-10-15',minimum:45},now)
  const next=data.cardStatements.find(s=>s.dueDate==='2026-10-15')
  assert.equal(statementTotals(next,data.payments,now).remaining,45)
  assert.throws(()=>saveStatement(data,{cardId:'card',dueDate:'2026-10-15',minimum:45},now),/already exists/)
})
test('allocation corrections do not change balances or payment amounts',()=>{
  let data=pay(base(),100);data=saveStatement(data,{cardId:'card',dueDate:'2026-10-15',minimum:40},now)
  const next=data.cardStatements.at(-1);data=reassignPayment(data,data.payments[0].id,next.id,'card',now)
  assert.equal(balance(data,'card'),900);assert.equal(statementTotals(next,data.payments,now).actualPaid,100)
  assert.equal(statementTotals(data.cardStatements[0],data.payments,now).remaining,50)
})
test('a confirmed new minimum can include past-due minimums without reserving them twice',()=>{
  const data=saveStatement(base(),{cardId:'card',dueDate:'2026-10-15',minimum:90,includesPastDue:true},now)
  assert.equal(trackedObligations(data,now).filter(x=>x.kind==='card').reduce((s,x)=>s+x.remaining,0),90)
  assert.equal(data.cardStatements[0].minimum,50)
  assert.equal(validateData(data),true)
})
test('unpaid bill occurrence remains overdue as new occurrences are created',()=>{
  const data=prepareData(billData(),new Date(2026,9,2,12)),items=trackedObligations(data,new Date(2026,9,2,12)).filter(o=>o.kind==='bill')
  assert.deepEqual(items.map(x=>x.dateKey),['2026-08-28','2026-09-28','2026-10-28'])
  assert.equal(items.reduce((s,x)=>s+x.remaining,0),300)
})
test('lower actual invoice can be fully settled without a phantom remainder',()=>{
  let data=billData();data=confirmBillCycle(data,data.billCycles[0].id,90,now);data=billPay(data,90)
  assert.equal(cycleTotals(data.billCycles[0],data.billPayments,now).remaining,0)
})
test('higher actual invoice preserves the real paid amount',()=>{
  let data=billData();data=confirmBillCycle(data,data.billCycles[0].id,120,now);data=billPay(data,120)
  assert.deepEqual(cycleTotals(data.billCycles[0],data.billPayments,now),{required:120,actualPaid:120,paid:120,remaining:0})
})
test('partial payments and changed future prices do not rewrite past invoices',()=>{
  let data=billPay(billData(),40);data.bills[0].amount=150;data=prepareData(data,new Date(2026,8,1,12))
  assert.equal(data.billCycles[0].expectedAmount,100);assert.equal(data.billCycles.at(-1).expectedAmount,150)
  assert.equal(cycleTotals(data.billCycles[0],data.billPayments,now).remaining,60)
})
test('card subscription charge increases debt without reducing or reserving cash again',()=>{
  const original=billData('card'),before=cashAfterObligations(original,now),data=billPay(original,100,{bankId:'card'})
  assert.equal(balance(data,'card'),1100);assert.equal(balance(data,'bank'),2000)
  assert.equal(cashAfterObligations(data,now),before)
  assert.equal(balance(removeRecurringPayment(data,data.billPayments[0].id,now),'card'),1000)
})
test('paying cash bill reduces cash and outstanding commitment equally',()=>{
  const data=billData(),before=cashAfterObligations(data,now)
  assert.equal(cashAfterObligations(billPay(data,40),now),before)
})
test('archiving a bill stops future occurrences without erasing overdue ones',()=>{
  const data=billData();data.bills[0].active=false
  const later=prepareData(data,new Date(2026,10,1,12))
  assert.equal(later.billCycles.length,1)
  assert.equal(trackedObligations(later,new Date(2026,10,1,12)).filter(o=>o.kind==='bill').length,1)
})
test('month-end scheduling recovers the original due day after February',()=>{
  const bill={dueDay:31,frequency:'monthly'}
  assert.equal(nextBillDate('2028-01-31',bill),'2028-02-29')
  assert.equal(nextBillDate('2028-02-29',bill),'2028-03-31')
})
test('annual renewals retain the renewal day rather than an unused monthly due day',()=>{
  assert.equal(nextBillDate('2026-11-15',{frequency:'annual',dueDay:1,nextDueDate:'2026-11-15'}),'2027-11-15')
})
test('migration is idempotent and preserves every balance and original payment amount',()=>{
  const source=raw();source.payments=[{id:'old',cardId:'card',bankId:'bank',amount:99,date:'2026-08-26T12:00:00Z',cycleDueDateBefore:'2026-09-15'}]
  const data=prepareData(source,now)
  assert.deepEqual(prepareData(data,now),data)
  assert.deepEqual(data.accounts,source.accounts);assert.equal(data.payments[0].amount,99)
  assert.equal(data.cardStatements[0].needsReview,true)
})
test('reconciliation records an explained adjustment, not spending or income',()=>{
  const data=reconcileAccount(base(),{accountId:'bank',balance:1842.17,reason:'Bank balance checked; missing opening entry'},now)
  assert.equal(balance(data,'bank'),1842.17);assert.equal(data.adjustments[0].delta,-157.83)
  assert.equal(data.transactions.length,0);assert.throws(()=>reconcileAccount(base(),{accountId:'bank',balance:0,reason:''},now),/explain/)
})
for(const accountId of ['bank','card'])test(`${accountId} refund reverses correctly, including credit balances`,()=>{
  const data=recordRefund(base(),{accountId,amount:1100,date:'2026-08-27',merchant:'Store',category:'Shopping'},now)
  assert.equal(balance(data,accountId),accountId==='bank'?3100:-100)
  assert.equal(netSpendingEntries(data)[0].amount,-1100)
  assert.equal(balance(removeLedgerTransaction(data,data.transactions[0].id,now),accountId),accountId==='bank'?2000:1000)
})
test('editing an expense reverses the original before applying the replacement',()=>{
  let data=saveLedgerTransaction(base(),{accountId:'bank',amount:1200,date:'2026-08-27',merchant:'Store'},'purchase',now)
  data=saveLedgerTransaction(data,{...data.transactions[0],date:'2026-08-27',amount:1300},'purchase',now)
  assert.equal(balance(data,'bank'),700)
  assert.equal(balance(removeLedgerTransaction(data,data.transactions[0].id,now),'bank'),2000)
})
test('refunds reduce reports on the day received and comparison uses matching elapsed days',()=>{
  const entries=[{localDate:'2026-07-10',amount:100},{localDate:'2026-07-30',amount:900},{localDate:'2026-08-10',amount:100},{localDate:'2026-08-20',amount:-20}]
  assert.equal(trendComparison(entries,now).previous,100)
  assert.equal(trendComparison(entries,now).current,80)
  assert.equal(monthlyTrend(entries,2,now)[1].total,80)
})
function memoryStorage(){const entries=new Map();return {entries,getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)}}
test('save, reload, export and restore retain all financial records',()=>{
  let data=billPay(pay(billData(),70),100);data=reconcileAccount(data,{accountId:'bank',balance:1700,reason:'Checked'},now)
  const storage=memoryStorage(),repo=createRepository(storage,'test');repo.load(raw());repo.save(data)
  const restored=parseBackup(JSON.stringify({schema:'debt-free-backup-v1',data}))
  assert.deepEqual(restored,prepareData(data))
  assert.deepEqual(createRepository(storage,'test').load(raw()),prepareData(data))
})
test('storage failures never replace the last saved data',()=>{
  const storage=memoryStorage();storage.setItem('test',JSON.stringify(base()));const repo=createRepository(storage,'test');repo.load(raw());const before=storage.getItem('test')
  storage.setItem=()=>{throw new Error('quota')}
  assert.throws(()=>repo.save(pay(base(),50)),/Could not save/);assert.equal(storage.getItem('test'),before)
})
test('concurrent tabs cannot silently overwrite each other',()=>{
  const storage=memoryStorage(),first=createRepository(storage,'test'),second=createRepository(storage,'test');first.load(raw());second.load(raw());first.save(pay(base(),50))
  assert.throws(()=>second.save(pay(base(),100)),/Another tab/)
})
test('malformed stored data is preserved and cannot be replaced by empty defaults',()=>{
  const storage=memoryStorage();storage.setItem('test','{broken');const repo=createRepository(storage,'test');repo.load(raw())
  assert.match(repo.error,/not been replaced/);assert.throws(()=>repo.save(base()),/not been replaced/);assert.equal(storage.getItem('test'),'{broken')
})
test('backup rejects duplicate IDs, unknown formats, bad optional arrays and broken statement links',()=>{
  const data=base();assert.equal(validateData({...data,accounts:[...data.accounts,data.accounts[0]]}),false)
  assert.equal(validateData({...data,billPayments:{}}),false)
  const paid=pay(data,50);paid.payments[0].statementId='missing';assert.equal(validateData(paid),false)
  assert.throws(()=>parseBackup(JSON.stringify({schema:'future',data})),/unsupported/)
})
test('previous saved snapshot and pre-upgrade data are retained',()=>{
  const storage=memoryStorage();storage.setItem('test',JSON.stringify(raw()));const repo=createRepository(storage,'test'),loaded=repo.load(raw());repo.save(loaded);repo.save(pay(loaded,50))
  assert.deepEqual(JSON.parse(storage.getItem('test-before-v090')),raw())
  assert.deepEqual(JSON.parse(storage.getItem('test-previous')),loaded)
})
test('final application connects the real workflow functions and zero-extra default',async()=>{
  const output=config.plugins[0].transform(await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),'/src/App.jsx')
  assert.match(output,/recordCardPayment\(data,form\)/);assert.match(output,/recordBillPayment\(data,form\)/)
  assert.match(output,/strategy:'avalanche',extra:0/);assert.match(output,/persistState\(ready\);setData\(ready\)/)
  assert.match(output,/Cash after tracked obligations/);assert.match(output,/ReliabilityCenter data=/)
  assert.doesNotMatch(output,/nextDueDate:cycleComplete\?/)
  assert.match(output,/statementId:''/)
})
test('the final form handler records two payments without advancing statements',async()=>{
  const output=config.plugins[0].transform(await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),'/src/App.jsx'),line=output.split('\n').find(l=>l.startsWith(' const addPayment='))
  let data=base()
  for(const amount of [50,100]){
    const form={amount,cardId:'card',bankId:'bank',date:'2026-08-27',statementId:data.cardStatements[0].id},finish=next=>{data=next},handler=Function('data','form','recordCardPayment','transactionDay','action','confirm','finish',`${line};return addPayment`)(data,form,(d,f)=>recordCardPayment(d,f,now),p=>p.localDate,fn=>fn(),()=>true,finish)
    handler({preventDefault(){}})
  }
  assert.equal(data.cardStatements.length,1);assert.equal(data.accounts[0].nextDueDate,'2026-09-15')
  assert.equal(statementTotals(data.cardStatements[0],data.payments,now).actualPaid,150)
})
