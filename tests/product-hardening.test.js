import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareData,saveLedgerTransaction,recordCardPayment,netSpendingEntries,reconcileAccount,recordRefund,removeLedgerTransaction,saveRecurringBill } from '../src/lib/finance.js'
import { projectedObligations } from '../src/lib/obligationProjection.js'
import { cashFlowForecast } from '../src/lib/incomeForecast.js'
import { cashPosition,saveCashPlan } from '../src/lib/cashPosition.js'
import { createBillPaymentDraft,saveBillCharge } from '../src/lib/billRecording.js'
import { clearPending } from '../src/lib/clearPending.js'
import { setBillException } from '../src/lib/billExceptions.js'
import { recordChange } from '../src/lib/changeHistory.js'
import { validateData } from '../src/lib/backup.js'
import { anonymizeDiagnosticData } from '../src/lib/diagnosticExport.js'
import { createCloudWorkspace } from '../src/lib/cloudRecovery.js'
const now=new Date(2026,9,13,12)
const fixture=()=>prepareData({accounts:[{id:'bank',type:'checking',name:'Checking',balance:250,reconciledAt:now.toISOString()},{id:'card',type:'credit',name:'Card',balance:1000,minimum:100,apr:20,nextDueDate:'2026-10-27'}],transactions:[],payments:[],bills:[],cardStatements:[{id:'oct',cardId:'card',dueDate:'2026-10-27',minimum:100,verification:'issuer-confirmed',needsReview:false}],extra:0},now)
const plan=data=>saveCashPlan(data,{reserveMode:'month-end',reserveEnd:'2026-10-31',accountId:'bank',buffer:0,essentialsRemaining:0,cardFunding:{card:'bank'}},now)
test('a later invoice does not hide intervening expected bill months',()=>{
 const data=fixture();data.bills=[{id:'bill',name:'Subscription',amount:20,accountId:'bank',frequency:'monthly',dueDay:6,nextDueDate:'2026-12-06'}];data.billCycles=[{id:'oct-bill',billId:'bill',dueDate:'2026-10-06',expectedAmount:20,actualAmount:20},{id:'dec-bill',billId:'bill',dueDate:'2026-12-06',expectedAmount:20,actualAmount:20}];data.billPayments=[{id:'p',billId:'bill',cycleId:'oct-bill',bankId:'bank',amount:20,date:'2026-10-06',localDate:'2026-10-06'}];const before=structuredClone(data)
 assert.ok(projectedObligations(data,now,'2026-12-06').some(o=>o.dateKey==='2026-11-06'&&o.remaining===20&&o.estimated));assert.deepEqual(data,before)
})
test('same-day bills are conservatively included before expected deposit',()=>{
 const data=fixture();data.incomeSchedules=[{id:'pay',name:'Pay',accountId:'bank',amount:500,frequency:'monthly',nextDate:'2026-10-27',active:true}];const result=cashFlowForecast(data,now);assert.equal(result.dueBeforeIncome,100);assert.equal(result.sameDay,true)
})
test('pending card payment reserves once, meets no minimum, and clears exactly once',()=>{
 const source=plan(fixture()),pending=recordCardPayment(source,{cardId:'card',bankId:'bank',statementId:'oct',amount:80,date:'2026-10-13',status:'pending'},now)
 assert.equal(pending.accounts[0].balance,250);assert.equal(cashPosition(pending,now).afterKnownDues,150);assert.equal(cashPosition(pending,now).reserveExtra,150)
 const cleared=clearPending(pending,'payment',pending.payments[0].id,now);assert.equal(cleared.accounts[0].balance,170);assert.equal(cashPosition(cleared,now).afterKnownDues,150);assert.throws(()=>clearPending(cleared,'payment',cleared.payments[0].id,now));assert.ok(validateData(cleared))
})
test('pending incoming income is not spendable and does not consume a forecast occurrence',()=>{
 const source=fixture();source.incomeSchedules=[{id:'pay',name:'Pay',accountId:'bank',amount:500,frequency:'monthly',nextDate:'2026-10-13',active:true}];const pending=saveLedgerTransaction(source,{accountId:'bank',merchant:'Pay',amount:500,date:'2026-10-13',status:'pending',incomeScheduleId:'pay',scheduledIncomeDate:'2026-10-13'},'income',now);assert.equal(pending.accounts[0].balance,250);assert.equal(cashFlowForecast(pending,now).nextIncome.date,'2026-10-13')
})
test('pending expense conversion to bill preserves its status and applies balance once when cleared',()=>{
 let source=fixture();source.bills=[{id:'bill',name:'Bill',amount:20,accountId:'bank',frequency:'monthly',dueDay:6,nextDueDate:'2026-10-06'}];source=saveLedgerTransaction(source,{accountId:'bank',amount:20,date:'2026-10-13',merchant:'Bill',category:'Subscriptions',status:'pending'},'purchase',now);const result=saveBillCharge(source,{billId:'bill',dueDate:'2026-10-06',transactionId:source.transactions[0].id},now);assert.equal(result.accounts[0].balance,250);assert.equal(result.billPayments[0].status,'pending');assert.equal(clearPending(result,'bill',result.billPayments[0].id,now).accounts[0].balance,230)
})
test('historical payments remain balance-neutral even with a stale pending form selection',()=>{
 const result=recordCardPayment(fixture(),{cardId:'card',bankId:'bank',statementId:'oct',amount:80,date:'2026-10-13',status:'pending',historical:true},now);assert.equal(result.accounts[0].balance,250);assert.equal(result.payments[0].status,'cleared')
})
test('general pending repayment remains general after clearing',()=>{
 const pending=recordCardPayment(fixture(),{cardId:'card',bankId:'bank',paymentIntent:'extra',amount:20,date:'2026-10-13',status:'pending'},now),cleared=clearPending(pending,'payment',pending.payments[0].id,now);assert.equal(cleared.payments[0].assignmentStatus,'extra');assert.equal(cleared.payments[0].statementId,'')
})
test('old balance-affecting correction invalidates a checkpoint; reconciliation clears the warning',()=>{
 const source=fixture(),next=saveLedgerTransaction(source,{accountId:'bank',merchant:'Old',amount:10,date:'2026-10-10'},'purchase',now),changed=recordChange(source,next,'Backdated expense',now);assert.equal(changed.accounts[0].reconciliationNeedsReview,true);assert.equal(cashPosition(plan(changed),now).reserveExtra,null);assert.equal(reconcileAccount(changed,{accountId:'bank',balance:240,reason:'Checked'},now).accounts[0].reconciliationNeedsReview,false)
})
test('split expenses affect balance once and reports expand into exact category parts',()=>{
 const next=saveLedgerTransaction(fixture(),{accountId:'bank',merchant:'Store',amount:30,date:'2026-10-13',splits:[{category:'Food & Drink',amount:10},{category:'Shopping & Personal',amount:20}]},'purchase',now);assert.equal(next.accounts[0].balance,220);assert.deepEqual(netSpendingEntries(next).map(t=>t.amount),[10,20]);assert.ok(validateData(next));assert.throws(()=>saveLedgerTransaction(fixture(),{accountId:'bank',amount:30,date:'2026-10-13',splits:[{category:'Other',amount:20}]},'purchase',now));next.transactions[0].splits='';assert.equal(validateData(next),false)
})
test('bill future-month acknowledgement is required and skip does not fabricate a payment',()=>{
 const source=fixture();source.bills=[{id:'bill',name:'Bill',amount:20,accountId:'bank',frequency:'monthly',dueDay:6,nextDueDate:'2026-10-06'}];const ready=prepareData(source,now);assert.throws(()=>saveBillCharge(ready,{billId:'bill',bankId:'bank',amount:20,date:'2026-10-13',dueDate:'2026-11-06'},now),/future bill month/);const result=setBillException(ready,ready.billCycles.find(c=>c.billId==='bill').id,'skipped','Paused this month',now);assert.equal(result.billPayments.length,0);assert.equal(result.accounts[0].balance,250)
})
test('diagnostic export anonymizes new free-text bill reasons',()=>{
 const source=fixture();source.billCycles=[{exceptionReason:'Private merchant name'}];assert.ok(!JSON.stringify(anonymizeDiagnosticData(source)).includes('Private merchant name'))
})
test('async device protection failure submits no cloud write and is not called protected',async()=>{
 let writes=0,state;const workspace=createCloudWorkspace({uid:'test',store:{read:async()=>null,write:async()=>{throw Error('Storage unavailable')}},readCloud:async()=>fixture(),writeCloud:async()=>{writes++},onState:value=>state=value});await workspace.load();const task=workspace.save(fixture());await assert.rejects(task);assert.equal(writes,0);assert.equal(state.status,'protection-failed')
})
test('offline acknowledged copy is recovered without an invented cloud acknowledgement',async()=>{
 let state;const source=fixture();const workspace=createCloudWorkspace({uid:'test',store:{read:async()=>null,cached:async()=>({data:source,updatedAt:'2026-10-13'})},readCloud:async()=>{throw Error('Offline')},writeCloud:async()=>{},onState:value=>state=value});assert.deepEqual(await workspace.load(),source);assert.equal(state.status,'offline')
})
test('a missing current bill month remains due even after its scheduled day passed',()=>{
 const data=fixture();data.bills=[{id:'bill',name:'Bill',amount:20,accountId:'bank',frequency:'monthly',dueDay:6,nextDueDate:'2026-12-06'}];data.billCycles=[{id:'sep-bill',billId:'bill',dueDate:'2026-09-06',expectedAmount:20,actualAmount:20},{id:'dec-bill',billId:'bill',dueDate:'2026-12-06',expectedAmount:20,actualAmount:20}];const projected=projectedObligations(data,now,'2026-10-31').find(o=>o.billId==='bill'&&o.estimated);assert.equal(projected.dateKey,'2026-10-06');const draft=createBillPaymentDraft(data,data.bills[0],{dueDate:projected.dateKey},now);assert.equal(draft.dueDate,'2026-10-06');assert.equal(draft.cycleId,'')
})
test('an estimated missing month can be skipped explicitly without fabricating a payment',()=>{
 const data=fixture();data.bills=[{id:'bill',name:'Bill',amount:20,accountId:'bank',frequency:'monthly',dueDay:6,nextDueDate:'2026-12-06'}];const next=setBillException(data,{billId:'bill',dueDate:'2026-10-06'},'skipped','Provider paused',now);assert.ok(next.billCycles.some(c=>c.dueDate==='2026-10-06'&&c.status==='skipped'));assert.equal(next.billPayments.length,0)
})
test('cancellation suppresses future schedule estimates but retains actual invoices',()=>{
 let data=fixture();data=saveRecurringBill(data,{name:'Bill',amount:20,nextDueDate:'2026-10-20',cancelFrom:'2026-11-01',accountId:'bank'},now);assert.ok(!projectedObligations(data,now,'2026-12-31').some(o=>o.billId===data.bills[0].id&&o.dateKey>='2026-11-01'));data.billCycles.push({id:'final',billId:data.bills[0].id,dueDate:'2026-11-06',expectedAmount:20,actualAmount:10});assert.ok(projectedObligations(data,now,'2026-12-31').some(o=>o.id==='bill-final'&&o.remaining===10))
})
test('linked refunds are bounded and original edits/removal cannot orphan their history',()=>{
 let data=saveLedgerTransaction(fixture(),{accountId:'bank',merchant:'Store',amount:30,date:'2026-10-12'},'purchase',now);const id=data.transactions[0].id;data=recordRefund(data,{accountId:'bank',merchant:'Store',amount:10,date:'2026-10-13',originalTransactionId:id},now);assert.equal(data.accounts[0].balance,230);assert.throws(()=>recordRefund(data,{accountId:'bank',merchant:'Store',amount:21,date:'2026-10-13',originalTransactionId:id},now),/exceed/);assert.throws(()=>removeLedgerTransaction(data,id,now),/linked refunds/);assert.throws(()=>saveLedgerTransaction(data,{...data.transactions.find(t=>t.id===id),amount:5,date:'2026-10-12'},'purchase',now),/linked refunds/);assert.ok(validateData(data))
})
test('a changed completed spending month needs confirmation again, including historical-only corrections',()=>{
 const before=fixture();before.completedMonths=['2026-09'];const changed=saveLedgerTransaction(before,{accountId:'bank',merchant:'Old history',amount:10,date:'2026-09-12',historical:true},'purchase',now);const next=recordChange(before,changed,'Historical expense',now);assert.deepEqual(next.completedMonths,[]);assert.equal(next.accounts[0].balance,250)
})
test('a pending payment covering a minimum brings its actual funding bank into safety checks',()=>{
 let data=plan(fixture());data.accounts.push({id:'other',name:'Other',type:'checking',balance:10,reconciledAt:now.toISOString()});data=recordCardPayment(data,{bankId:'other',cardId:'card',statementId:'oct',amount:100,date:'2026-10-13',status:'pending'},now);assert.equal(cashPosition(data,now).reserveExtra,null);assert.ok(cashPosition(data,now).safety.reasons.some(r=>r.includes('cannot cover')))
})
