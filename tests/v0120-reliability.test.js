import test from 'node:test'
import assert from 'node:assert/strict'
import { repairDuplicateBillCycles, prepareData, saveStatement } from '../src/lib/finance.js'
import { validateData } from '../src/lib/backup.js'
import { monthlyCategoryTrend } from '../src/lib/reporting.js'
import { payoffBudget, simulatePayoff } from '../src/lib/payoff.js'
import { zeroBalanceCardState } from '../src/lib/cardPresentation.js'
import { analyzeDataHealth } from '../src/lib/dataHealth.js'
import { writeCloudData } from '../src/lib/firebaseClient.js'
import { parseBackup } from '../src/lib/storage.js'

const now=new Date(2026,8,29,12)
const fixture=()=>({financeVersion:1,accounts:[
  {id:'bank',name:'Checking',type:'checking',balance:1200},
  {id:'zero',name:'Zero card',type:'credit',balance:0,minimum:10,apr:20},
  {id:'due',name:'Active card',type:'credit',balance:2000,minimum:100,apr:25},
],transactions:[],payments:[{id:'card-pay',bankId:'bank',cardId:'zero',amount:250,date:'2026-09-24T12:00:00Z',localDate:'2026-09-24',historical:false,statementId:'sep',assignmentStatus:'confirmed'}],bills:[{id:'bill',name:'Subscription',amount:3,accountId:'bank',frequency:'monthly',nextDueDate:'2026-10-06',dueDay:6,active:false},{id:'card-bill',name:'Card subscription',amount:20,accountId:'zero',frequency:'monthly',nextDueDate:'2026-10-27',dueDay:27,active:true}],billPayments:[{id:'bill-pay',billId:'bill',cycleId:'cycle',bankId:'bank',amount:3,date:'2026-09-08T12:00:00Z',localDate:'2026-09-08',historical:false}],cardStatements:[{id:'sep',cardId:'zero',dueDate:'2026-09-27',minimum:10,needsReview:false},{id:'oct',cardId:'due',dueDate:'2026-10-15',minimum:100,needsReview:false}],billCycles:[{id:'cycle',billId:'bill',dueDate:'2026-10-06',expectedAmount:3,actualAmount:3,needsReview:false},{id:'cycle',billId:'bill',dueDate:'2026-10-06',expectedAmount:3,actualAmount:null,needsReview:false},{id:'future',billId:'card-bill',dueDate:'2026-10-27',expectedAmount:20,actualAmount:null,needsReview:false}],adjustments:[],incomeSchedules:[],creditScores:[],extra:50})

test('a confirmed occurrence survives a narrow duplicate repair with its payment and balances intact',()=>{
  const source=fixture(),before=structuredClone(source)
  assert.equal(validateData(source),false)
  const result=repairDuplicateBillCycles(source)
  assert.equal(result.repaired,1)
  assert.equal(validateData(result.data),true)
  assert.deepEqual(result.data.accounts,before.accounts)
  assert.deepEqual(result.data.billPayments,before.billPayments)
  assert.equal(result.data.billCycles.find(c=>c.id==='cycle').actualAmount,3)
  assert.equal(result.data.repairHistory[0].removedRecord.actualAmount,null)
  assert.deepEqual(source,before)
  assert.equal(repairDuplicateBillCycles(result.data).repaired,0)
  assert.equal(validateData(prepareData(source,now)),true)
})

test('a conflicting duplicate is never silently discarded',()=>{
  const source=fixture()
  source.billCycles[1].actualAmount=4
  assert.equal(repairDuplicateBillCycles(source).repaired,0)
  assert.equal(validateData(source),false)
  source.billCycles[1].id='other-cycle'
  assert.equal(validateData(source),false)
})

test('a previous backup with the known empty duplicate can be repaired on restore',()=>{
  const restored=parseBackup(JSON.stringify({data:fixture()}))
  assert.equal(validateData(restored),true)
  assert.equal(restored.repairHistory.length,1)
  assert.equal(restored.billPayments[0].cycleId,'cycle')
})

test('Other appears once and category totals still equal actual spending',()=>{
  const result=monthlyCategoryTrend([{localDate:'2026-09-01',category:'Other',amount:100},{localDate:'2026-09-02',category:'Food & Drink',amount:10}],1,now)
  assert.deepEqual(result.categories,['Food & Drink','Other'])
  assert.equal(result.months[0].values.Other,100)
  assert.equal(result.months[0].total,110)
})

test('a zero balance has its own honest status, including scheduled card charges',()=>{
  const data=prepareData(fixture(),now),zero=data.accounts.find(a=>a.id==='zero')
  const state=zeroBalanceCardState(data,zero,now)
  assert.equal(state.label,'$0 balance today')
  assert.equal(state.lastDue,'2026-09-27')
  assert.match(state.detail,/1 recurring charge is still scheduled/)
  assert.ok(!analyzeDataHealth(data,now).issues.some(issue=>issue.title==='Zero card needs a current statement'))
})

test('freed minimums are excluded by default and rolled only by explicit choice',()=>{
  const cards=fixture().accounts.filter(a=>a.type==='credit')
  const cautious=payoffBudget(cards,50,false),rolled=payoffBudget(cards,50,true)
  assert.equal(cautious.activeMinimums,100)
  assert.equal(cautious.freedMinimums,10)
  assert.equal(cautious.monthlyBudget,150)
  assert.equal(rolled.monthlyBudget,160)
  assert.ok(simulatePayoff(rolled.debts,rolled.extraBudget).months<simulatePayoff(cautious.debts,cautious.extraBudget).months)
})

test('new statements retain an explicit issuer-confirmed versus estimated distinction',()=>{
  const original=prepareData(fixture(),now)
  const estimated=saveStatement(original,{cardId:'due',dueDate:'2026-11-15',minimum:90,issuerConfirmed:false},now)
  assert.equal(estimated.cardStatements.find(s=>s.dueDate==='2026-11-15').verification,'estimated')
  const verified=saveStatement(estimated,{cardId:'due',dueDate:'2026-12-15',minimum:80,issuerConfirmed:true},now)
  assert.equal(verified.cardStatements.find(s=>s.dueDate==='2026-12-15').verification,'issuer-confirmed')
  assert.equal(validateData(verified),true)
})

test('invalid cloud records are rejected before any network request',async()=>{
  await assert.rejects(writeCloudData('user',fixture()),/data-integrity repair/)
})
