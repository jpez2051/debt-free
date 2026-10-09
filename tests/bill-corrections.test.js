import test from 'node:test'
import assert from 'node:assert/strict'
import { billBalanceChanges, billMonthDate, createBillPaymentDraft, editBillPaymentDraft, possibleBillMatches, saveBillCharge } from '../src/lib/billRecording.js'
import { billDisplayCycle, cycleTotals, netSpendingEntries, prepareData, removeRecurringPayment } from '../src/lib/finance.js'
import { validateData } from '../src/lib/backup.js'

const now=new Date(2026,9,9,12)
const fixture=()=>prepareData({financeVersion:1,accounts:[{id:'bank',name:'Checking',type:'checking',balance:97},{id:'savings',name:'Savings',type:'savings',balance:20},{id:'card',name:'Card',type:'credit',balance:40}],transactions:[{id:'debit',kind:'transfer',merchant:'Subscription provider',amount:3,accountId:'bank',toAccountId:'',transferPurpose:'Savings contribution',date:'2026-10-08T12:00:00Z',localDate:'2026-10-08',historical:false}],payments:[],bills:[{id:'bill',name:'Subscription',amount:3,dueDay:6,nextDueDate:'2026-11-06',frequency:'monthly',accountId:'bank',active:true,category:'Subscriptions',subcategory:'Memberships'}],billCycles:[{id:'oct',billId:'bill',dueDate:'2026-10-06',expectedAmount:3,actualAmount:null},{id:'nov',billId:'bill',dueDate:'2026-11-06',expectedAmount:3,actualAmount:3}],billPayments:[{id:'mistake',billId:'bill',billName:'Subscription',cycleId:'nov',amount:3,bankId:'bank',bankName:'Checking',fundingType:'checking',localDate:'2026-10-09',date:'2026-10-09T12:00:00Z',historical:true}],adjustments:[],strategy:'avalanche',extra:0},now)

test('the top Bills action selects October whether given a month ID or record',()=>{
  const data=fixture(),bill=data.bills[0]
  for(const selected of ['oct',data.billCycles[0],undefined]){
    const draft=createBillPaymentDraft(data,bill,selected,now)
    assert.equal(draft.cycleId,'oct');assert.equal(draft.dueDate,'2026-10-06');assert.equal(draft.amount,3)
    const saved=saveBillCharge(data,{...draft,historical:true},now)
    assert.equal(cycleTotals(saved.billCycles.find(c=>c.id==='oct'),saved.billPayments,now).remaining,0)
  }
})

test('wrong November charge and October transfer become one October bill entry with checking unchanged',()=>{
  const data=fixture(),before=structuredClone(data)
  const next=saveBillCharge(data,{...editBillPaymentDraft(data,data.billPayments[0]),dueDate:'2026-10-06',transactionId:'debit'},now)
  assert.deepEqual(data,before)
  assert.equal(next.accounts[0].balance,97)
  assert.equal(next.transactions.length,0)
  assert.equal(next.billPayments.length,1)
  assert.equal(next.billPayments[0].id,'mistake')
  assert.equal(next.billPayments[0].cycleId,'oct')
  assert.equal(next.billPayments[0].localDate,'2026-10-08')
  assert.equal(next.billPayments[0].historical,false)
  assert.equal(cycleTotals(next.billCycles.find(c=>c.id==='oct'),next.billPayments,now).remaining,0)
  assert.equal(cycleTotals(next.billCycles.find(c=>c.id==='nov'),next.billPayments,now).remaining,3)
  assert.equal(billDisplayCycle(next,next.bills[0],now).dueDate,'2026-10-06')
  assert.deepEqual(billBalanceChanges(data,next),[])
  assert.equal(netSpendingEntries(next).reduce((n,p)=>n+p.amount,0),3)
  assert.ok(validateData(next))
  const undone=removeRecurringPayment(next,'mistake',now)
  assert.equal(undone.accounts[0].balance,100)
  assert.equal(cycleTotals(undone.billCycles.find(c=>c.id==='oct'),undone.billPayments,now).remaining,3)
})

test('edit amount and account reverses only the old effect; moving month alone preserves balances',()=>{
  let data=fixture();data.billPayments=[]
  data=saveBillCharge(data,{billId:'bill',dueDate:'2026-10-06',date:'2026-10-09',bankId:'bank',amount:3,historical:false},now)
  const draft=editBillPaymentDraft(data,data.billPayments[0])
  const moved=saveBillCharge(data,{...draft,dueDate:'2026-11-06'},now)
  assert.equal(moved.accounts[0].balance,94)
  const changed=saveBillCharge(data,{...draft,bankId:'card',amount:5},now)
  assert.equal(changed.accounts[0].balance,97)
  assert.equal(changed.accounts[2].balance,45)
  assert.ok(validateData(changed))
  const historical=saveBillCharge(data,{...draft,historical:true},now)
  assert.equal(historical.accounts[0].balance,97)
})

test('converting expenses and outside transfers keeps cash/card effects applied exactly once',()=>{
  for(const [kind,accountId,historical,balance] of [['purchase','bank',false,97],['purchase','card',false,40],['transfer','bank',true,97]]){
    const data=fixture();data.billPayments=[];data.transactions[0]={...data.transactions[0],kind,accountId,historical}
    const next=saveBillCharge(data,{billId:'bill',dueDate:'2026-10-06',transactionId:'debit'},now)
    assert.equal(next.accounts.find(a=>a.id===accountId).balance,balance)
    assert.equal(next.billPayments[0].historical,historical)
    assert.equal(next.billPayments[0].amount,3)
    assert.equal(next.transactions.length,0)
  }
})

test('an internal transfer correction reverses the destination and previews it',()=>{
  const data=fixture();data.billPayments=[];data.transactions[0].toAccountId='savings'
  const next=saveBillCharge(data,{billId:'bill',dueDate:'2026-10-06',transactionId:'debit'},now)
  assert.equal(next.accounts[0].balance,97)
  assert.equal(next.accounts[1].balance,17)
  assert.deepEqual(billBalanceChanges(data,next).map(a=>[a.id,a.delta]),[['savings',-3]])
})

test('matching catches transfers and bill charges across nearby dates without merchant-name assumptions',()=>{
  const data=fixture(),draft={bankId:'bank',amount:3,date:'2026-10-09'}
  assert.deepEqual(possibleBillMatches(data,draft).map(p=>p.id),['mistake','debit'])
  assert.deepEqual(possibleBillMatches(data,{...draft,id:'mistake'}).map(p=>p.id),['debit'])
  assert.equal(possibleBillMatches(data,{...draft,date:'2026-09-09'}).length,0)
  assert.equal(possibleBillMatches(data,{...draft,bankId:'card'}).length,0)
})

test('missing historical bill months can be recorded without moving future schedule or changing balances',()=>{
  const data=fixture(),next=saveBillCharge(data,{billId:'bill',dueDate:billMonthDate(data,data.bills[0],'2026-08'),date:'2026-08-08',amount:3,bankId:'bank',historical:true},now)
  assert.equal(next.billCycles.find(c=>c.id===next.billPayments[0].cycleId).dueDate,'2026-08-06')
  assert.equal(next.bills[0].nextDueDate,'2026-11-06')
  assert.equal(next.accounts[0].balance,97)
  assert.ok(validateData(next))
  assert.equal(billMonthDate(data,{id:'other',dueDay:31},'2026-02'),'2026-02-28')
})

test('invalid correction is atomic and rejects missing entries and future posted activity',()=>{
  const data=fixture(),before=structuredClone(data),draft=editBillPaymentDraft(data,data.billPayments[0])
  assert.throws(()=>saveBillCharge(data,{...draft,transactionId:'missing'},now),/still in Activity/)
  assert.throws(()=>saveBillCharge(data,{...draft,date:'2026-11-09'},now),/Future activity/)
  assert.throws(()=>saveBillCharge(data,{...draft,id:'gone'},now),/no longer exists/)
  assert.deepEqual(data,before)
})
