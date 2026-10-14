import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareData, recordRefund, netSpendingEntries, saveLedgerTransaction, saveRecurringBill } from '../src/lib/finance.js'
import { cardTotals } from '../src/lib/cardTotals.js'
import { incomeConfirmationDraft } from '../src/lib/incomeConfirmation.js'
import { projectedObligations } from '../src/lib/obligationProjection.js'
import { billCadenceChange } from '../src/lib/billSchedule.js'
import { validateData } from '../src/lib/backup.js'
import { cashFlowForecast, readyIncomeOccurrences } from '../src/lib/incomeForecast.js'
import { billMonthDate, createBillPaymentDraft } from '../src/lib/billRecording.js'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const now=new Date(2026,4,1,12)
const base=()=>prepareData({accounts:[{id:'bank',name:'Checking',type:'checking',balance:1000}],transactions:[],payments:[],bills:[],extra:0},now)
const expense=()=>({...base(),transactions:[{id:'expense',kind:'purchase',accountId:'bank',merchant:'Store',date:'2026-04-01',localDate:'2026-04-01',amount:10,category:'Other',splits:[{category:'Food & Drink',subcategory:'Groceries',amount:6},{category:'Shopping & Personal',subcategory:'General Shopping',amount:4}]}]})
const refund={accountId:'bank',merchant:'Store',originalTransactionId:'expense',date:'2026-05-01',amount:10}
test('positive card debt and card credits are separate, rounded and read-only',()=>{
 const accounts=[{type:'credit',balance:900,limit:1000},{type:'credit',balance:-100,limit:1000},{type:'checking',balance:500}],before=structuredClone(accounts)
 assert.deepEqual(cardTotals(accounts),{debt:900,credits:100,utilization:45});assert.deepEqual(accounts,before)
 assert.equal(cardTotals([{type:'credit',balance:-1.01}]).debt,0)
})
test('full split refunds reverse each original category once, including legacy refunds',()=>{
 const source=expense(),next=recordRefund(source,refund,now)
 assert.equal(next.accounts[0].balance,1010);assert.equal(source.accounts[0].balance,1000)
 const sums={};for(const entry of netSpendingEntries(next))sums[entry.category]=(sums[entry.category]||0)+entry.amount
 assert.ok(Object.values(sums).every(v=>v===0));assert.ok(validateData(next))
 next.transactions[0].splits=[];assert.ok(netSpendingEntries(next).filter(t=>t.kind==='refund').some(t=>t.subcategory==='Groceries'&&t.amount===-6))
})
test('partial split refunds require allocation and enforce per-category caps',()=>{
 const source=expense();assert.throws(()=>recordRefund(source,{...refund,amount:3},now),/partial refund/)
 const next=recordRefund(source,{...refund,amount:3,splits:[{category:'Food & Drink',subcategory:'Groceries',amount:3}]},now)
 assert.throws(()=>recordRefund(next,{...refund,amount:4,splits:[{category:'Food & Drink',subcategory:'Groceries',amount:4}]},now),/cannot exceed/)
 const complete=recordRefund(next,{...refund,amount:7},now);assert.equal(complete.accounts[0].balance,1010)
 assert.equal(netSpendingEntries(complete).reduce((sum,t)=>sum+t.amount,0),0)
})
test('refund edits reverse the prior balance effect; historical refunds stay neutral',()=>{
 const next=recordRefund(expense(),refund,now),old=next.transactions[0]
 const edited=recordRefund(next,{...old,date:'2026-05-01',amount:4,splits:[{category:'Shopping & Personal',subcategory:'General Shopping',amount:4}]},now)
 assert.equal(edited.accounts[0].balance,1004);assert.equal(edited.transactions.filter(t=>t.kind==='refund').length,1)
 const historical=recordRefund(edited,{...edited.transactions[0],date:'2026-05-01',historical:true},now);assert.equal(historical.accounts[0].balance,1000)
})
test('legacy partial split refunds must be reviewed before adding another',()=>{
 const source=expense();source.transactions.push({...refund,id:'old',kind:'refund',amount:2,category:'Other',localDate:'2026-05-01'})
 assert.throws(()=>recordRefund(source,{...refund,amount:8},now),/earlier partial refund/)
 const fixed=recordRefund(source,{...source.transactions[1],splits:[{category:'Food & Drink',subcategory:'Groceries',amount:2}],historical:true},now);assert.equal(fixed.transactions.find(t=>t.id==='old').splits[0].amount,2)
})
test('confirming pending payday edits the same record and cannot double count',()=>{
 const data=base();data.incomeSchedules=[{id:'pay',name:'Salary',accountId:'bank',amount:500,frequency:'monthly',nextDate:'2026-05-01'}]
 const pending=saveLedgerTransaction(data,{accountId:'bank',merchant:'Salary',amount:480,date:'2026-05-01',status:'pending',incomeScheduleId:'pay',scheduledIncomeDate:'2026-05-01'},'income',now)
 const occurrence={scheduleId:'pay',date:'2026-05-01'},draft=incomeConfirmationDraft(pending,occurrence,now)
 assert.equal(draft.id,pending.transactions[0].id);assert.equal(draft.amount,480)
 assert.throws(()=>saveLedgerTransaction(pending,{...draft,id:undefined},'income',now),/already linked/)
 const cleared=saveLedgerTransaction(pending,{...draft,amount:490},'income',now);assert.equal(cleared.transactions.length,1);assert.equal(cleared.accounts[0].balance,1490)
 assert.throws(()=>incomeConfirmationDraft(cleared,occurrence,now),/already has/)
 const again=saveLedgerTransaction(cleared,{...draft,amount:490},'income',now);assert.equal(again.accounts[0].balance,1490)
 const extra=saveLedgerTransaction(cleared,{accountId:'bank',amount:10,merchant:'Second deposit',date:'2026-05-01'},'income',now);assert.equal(extra.accounts[0].balance,1500)
 pending.transactions.push({...pending.transactions[0],id:'duplicate'});assert.throws(()=>incomeConfirmationDraft(pending,occurrence,now),/multiple pending/)
})
test('monthly to annual preserves history and uses June anchor, never January annual',()=>{
 const data=base();data.bills=[{id:'bill',name:'Subscription',amount:10,frequency:'monthly',dueDay:6,nextDueDate:'2026-05-06',scheduleStartDate:'2026-01-06',accountId:'bank'}];data.billCycles=[{id:'jan',billId:'bill',dueDate:'2026-01-06',expectedAmount:10,actualAmount:10}]
 const next=saveRecurringBill(data,{...data.bills[0],frequency:'annual',amount:100,nextDueDate:'2026-06-06',scheduleChangeDate:'2026-05-01'},now)
 const projected=projectedObligations(next,now,'2027-06-06').filter(t=>t.billId==='bill'&&t.remaining>0&&t.dateKey>='2026-05-01')
 assert.deepEqual(projected.map(t=>t.dateKey),['2026-06-06','2027-06-06']);assert.equal(next.billCycles.find(t=>t.id==='jan').actualAmount,10);assert.equal(next.accounts[0].balance,1000);assert.ok(validateData(next))
 assert.deepEqual(prepareData(next,now),next)
})
test('future effective changes retain monthly dues until the new schedule begins',()=>{
 const data=base();data.bills=[{id:'bill',name:'Subscription',amount:10,frequency:'monthly',dueDay:6,nextDueDate:'2026-05-06',scheduleStartDate:'2026-01-06',accountId:'bank'}]
 const next=saveRecurringBill(data,{...data.bills[0],frequency:'annual',amount:100,nextDueDate:'2026-06-06',scheduleChangeDate:'2026-06-01'},now)
 assert.deepEqual(projectedObligations(next,now,'2026-06-30').filter(t=>t.billId==='bill').map(t=>[t.dateKey,t.required]),[['2026-05-06',10],['2026-06-06',100]])
 assert.throws(()=>saveRecurringBill(data,{...data.bills[0],frequency:'annual',nextDueDate:'2026-06-06',scheduleChangeDate:'2026-07-01'},now),/first charge/)
})
test('clamped dates do not create false cadence changes',()=>{
 assert.equal(billCadenceChange({frequency:'monthly',dueDay:31,nextDueDate:'2026-01-31'},{frequency:'monthly',nextDueDate:'2026-02-28'}),false)
 assert.equal(billCadenceChange({frequency:'annual',dueDay:29,nextDueDate:'2024-02-29'},{frequency:'annual',nextDueDate:'2027-02-28'}),false)
})
test('pending payday forecast uses the recorded deposit amount; ambiguous duplicates are excluded',()=>{
 const data=base();data.incomeSchedules=[{id:'pay',name:'Salary',accountId:'bank',amount:500,frequency:'monthly',nextDate:'2026-05-01'}]
 data.transactions=[{id:'pending',kind:'income',accountId:'bank',amount:450,status:'pending',date:'2026-05-01',incomeScheduleId:'pay',scheduledIncomeDate:'2026-05-01'}]
 assert.equal(cashFlowForecast(data,now,0).expectedIncome,450);assert.equal(readyIncomeOccurrences(data,now)[0].pendingCount,1)
 data.transactions.push({...data.transactions[0],id:'other'});assert.equal(cashFlowForecast(data,now,0).expectedIncome,0);assert.equal(readyIncomeOccurrences(data,now)[0].pendingCount,2)
})
test('refund category corrections remain balance-neutral and original edits cannot invalidate partial refunds',()=>{
 const source=expense(),next=recordRefund(source,{...refund,amount:3,splits:[{category:'Food & Drink',subcategory:'Groceries',amount:3}]},now)
 assert.throws(()=>saveLedgerTransaction(next,{...source.transactions[0],date:'2026-04-01',splits:[{category:'Transportation',subcategory:'Fuel',amount:10}]},'purchase',now),/refund category/i)
 const full=recordRefund(source,refund,now),recategorized=saveLedgerTransaction(full,{...source.transactions[0],historical:true,date:'2026-04-01',splits:[{category:'Transportation',subcategory:'Fuel',amount:10}]},'purchase',now)
 assert.ok(netSpendingEntries(recategorized).every(t=>t.category==='Transportation'));assert.equal(netSpendingEntries(recategorized).reduce((sum,t)=>sum+t.amount,0),0)
})
test('credit-card and odd-cent refunds apply whole amount once',()=>{
 const data=expense();data.accounts[0].type='credit';data.transactions[0].amount=3.01;data.transactions[0].splits=[{category:'Food & Drink',subcategory:'Groceries',amount:1.01},{category:'Shopping & Personal',subcategory:'General Shopping',amount:2}]
 const next=recordRefund(data,{...refund,amount:3.01},now);assert.equal(next.accounts[0].balance,996.99);assert.equal(Math.round(netSpendingEntries(next).reduce((sum,t)=>sum+t.amount,0)*100),0)
})
test('historical bill defaults retain old cadence amounts and confirmed future invoices survive amendments',()=>{
 const data=base();data.bills=[{id:'bill',name:'Subscription',amount:10,frequency:'monthly',dueDay:6,nextDueDate:'2026-05-06',scheduleStartDate:'2026-01-06',accountId:'bank'}];data.billCycles=[{id:'confirmed',billId:'bill',dueDate:'2026-07-06',expectedAmount:10,actualAmount:12}]
 const next=saveRecurringBill(data,{...data.bills[0],frequency:'annual',amount:100,nextDueDate:'2026-06-06',scheduleChangeDate:'2026-05-01'},now)
 assert.equal(next.billCycles.find(t=>t.id==='confirmed').actualAmount,12)
 const bill=next.bills[0],date=billMonthDate(next,bill,'2026-04');assert.equal(date,'2026-04-06');assert.equal(createBillPaymentDraft(next,bill,{dueDate:date},now).amount,10)
 const changed=saveRecurringBill(next,{...bill,frequency:'monthly',amount:9,nextDueDate:'2026-08-08',scheduleChangeDate:'2026-08-01'},new Date(2026,6,1,12))
 assert.ok(projectedObligations(changed,new Date(2026,6,1,12),'2026-09-30').some(t=>t.dateKey==='2026-09-08'&&t.required===9))
})
test('new credit, pending-payday and partial-refund controls render through the app pipeline',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'})
 try{
  const {default:AccountTiles}=await server.ssrLoadModule('/src/AccountTiles.jsx')
  const tiles=renderToStaticMarkup(React.createElement(AccountTiles,{accounts:[{id:'debt',name:'Debt',type:'credit',balance:900},{id:'credit',name:'Credit',type:'credit',balance:-100}]}))
  assert.match(tiles,/Card credit — in your favor/);assert.match(tiles,/\$100\.00/);assert.doesNotMatch(tiles,/-\$100/)
  const {default:IncomeForecast}=await server.ssrLoadModule('/src/IncomeForecast.jsx')
  const data=base();data.incomeSchedules=[{id:'pay',name:'Salary',accountId:'bank',amount:500,frequency:'monthly',nextDate:'2026-05-01'}];data.transactions=[{id:'pending',kind:'income',accountId:'bank',merchant:'Salary',amount:450,status:'pending',date:'2026-05-01',incomeScheduleId:'pay',scheduledIncomeDate:'2026-05-01'}]
  assert.match(renderToStaticMarkup(React.createElement(IncomeForecast,{data,now})),/Confirm recorded deposit/)
  data.transactions.push({...data.transactions[0],id:'other'})
  const ambiguous=renderToStaticMarkup(React.createElement(IncomeForecast,{data,now}));assert.match(ambiguous,/Multiple pending deposits/);assert.doesNotMatch(ambiguous,/Confirm recorded deposit/)
  const {default:RefundAllocationFields}=await server.ssrLoadModule('/src/RefundAllocationFields.jsx')
  const fields=renderToStaticMarkup(React.createElement(RefundAllocationFields,{data:expense(),form:refund,onChange(){}}));assert.match(fields,/Groceries — up to \$6\.00/);assert.match(fields,/General Shopping — up to \$4\.00/)
 }finally{await server.close()}
})
test('anchored schedules still create intervening overdue months after reopening',()=>{
 const saved=saveRecurringBill(base(),{name:'Monthly bill',amount:10,accountId:'bank',frequency:'monthly',nextDueDate:'2026-05-06'},now)
 const reopened=prepareData(saved,new Date(2026,7,1,12))
 assert.deepEqual(reopened.billCycles.map(c=>c.dueDate).sort(),['2026-05-06','2026-06-06','2026-07-06','2026-08-06'])
 assert.equal(reopened.accounts[0].balance,1000)
})
test('a planned annual switch retains intervening monthly obligations when reopening later',()=>{
 const saved=saveRecurringBill(base(),{name:'Monthly bill',amount:10,accountId:'bank',frequency:'monthly',nextDueDate:'2026-05-06'},now)
 const amended=saveRecurringBill(saved,{...saved.bills[0],frequency:'annual',amount:100,nextDueDate:'2026-08-06',scheduleChangeDate:'2026-08-01'},now)
 const reopened=prepareData(amended,new Date(2026,6,10,12))
 assert.deepEqual(reopened.billCycles.map(c=>[c.dueDate,c.expectedAmount]).sort(),[['2026-05-06',10],['2026-06-06',10],['2026-07-06',10],['2026-08-06',100]])
 assert.equal(reopened.billCycles.some(c=>c.dueDate==='2026-08-06'&&c.expectedAmount===10),false)
})
