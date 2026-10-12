import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareData } from '../src/lib/finance.js'
import { cashPosition, saveCashPlan } from '../src/lib/cashPosition.js'
import { validateData } from '../src/lib/backup.js'
const now=new Date(2026,9,30,12)
function fixture(){return prepareData({financeVersion:1,accounts:[{id:'bank',name:'Checking',type:'checking',balance:1200,reconciledAt:new Date(2026,9,30,10).toISOString()},{id:'card',name:'Card',type:'credit',balance:2000,minimum:100}],transactions:[],payments:[],bills:[{id:'rent',name:'Rent',amount:300,accountId:'bank',frequency:'monthly',dueDay:2,nextDueDate:'2026-11-02',active:true}],billCycles:[{id:'rent-nov',billId:'rent',dueDate:'2026-11-02',expectedAmount:300,actualAmount:300,needsReview:false}],cardStatements:[{id:'nov',cardId:'card',dueDate:'2026-11-04',minimum:100,verification:'issuer-confirmed',needsReview:false}],incomeSchedules:[{id:'pay',name:'Pay',amount:1000,accountId:'bank',frequency:'biweekly',nextDate:'2026-11-05',active:true}],extra:0},now)}
const plan=data=>saveCashPlan(data,{reserveMode:'next-payday',reserveEnd:'2026-11-05',accountId:'bank',cardFunding:{},buffer:'100',essentialsRemaining:'200'},now)
test('next-payday reserve crosses month-end without adding expected income or mutating records',()=>{
 const data=plan(fixture()),before=structuredClone(data),result=cashPosition(data,now)
 assert.equal(result.afterKnownDues,1200);assert.equal(result.reserveEnd,'2026-11-05');assert.equal(result.accountReserves[0].due,400);assert.equal(result.reserveExtra,500);assert.equal(result.safety.ready,true);assert.deepEqual(data,before);assert.ok(validateData(data))
})
test('unverified/missing statements and stale balances withhold extra rather than displaying a confident amount',()=>{
 const data=plan(fixture());data.cardStatements[0].verification='estimated';assert.equal(cashPosition(data,now).reserveExtra,null)
 data.cardStatements=[];assert.ok(cashPosition(data,now).safety.reasons.some(x=>x.includes('next statement')))
 const stale=plan(fixture());delete stale.accounts[0].reconciledAt;assert.equal(cashPosition(stale,now).reserveExtra,null)
})
test('multiple checking accounts do not pool funds or silently assign card dues',()=>{
 const data=plan(fixture());data.accounts.push({id:'second',name:'Second',type:'checking',balance:5000,reconciledAt:new Date(2026,9,30,10).toISOString()})
 assert.equal(cashPosition(data,now).unassigned,1);assert.equal(cashPosition(data,now).reserveExtra,null)
 data.cashPlan.cardFunding={card:'bank'};assert.equal(cashPosition(data,now).reserveExtra,500)
 data.accounts[0].balance=100;assert.equal(cashPosition(data,now).reserveExtra,null);assert.equal(cashPosition(data,now).accountReserves[1].afterDues,5000)
})
test('a changed payday requires explicit essentials/window review and due-on-payday is reserved',()=>{
 const data=plan(fixture());data.cardStatements[0].dueDate='2026-11-05';assert.equal(cashPosition(data,now).accountReserves[0].due,400)
 data.incomeSchedules[0].nextDate='2026-11-06';assert.equal(cashPosition(data,now).reservePlanned,false);assert.equal(cashPosition(data,now).reserveExtra,null)
})
test('future recurring bill months are estimates without creating or rewriting invoice history',()=>{
 const data=plan(fixture());data.cashPlan.reserveMode='custom';data.cashPlan.reserveEnd='2026-12-05';const before=structuredClone(data),result=cashPosition(data,now)
 assert.ok(result.reserveItems.some(x=>x.estimated&&x.dateKey==='2026-12-02'));assert.equal(result.reserveExtra,null);assert.deepEqual(data,before)
})
