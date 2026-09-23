import test from 'node:test'
import assert from 'node:assert/strict'
import { cashPosition, saveCashPlan } from '../src/lib/cashPosition.js'
import { validateData } from '../src/lib/backup.js'
import { cashFlowForecast } from '../src/lib/incomeForecast.js'
import { prepareData } from '../src/lib/finance.js'

const now=new Date(2026,8,22,12)
const data=()=>prepareData({financeVersion:1,accounts:[{id:'checking',name:'Checking',type:'checking',balance:1200},{id:'savings',name:'Savings',type:'savings',balance:5000},{id:'card',name:'Card',type:'credit',balance:2000,minimum:300,nextDueDate:'2026-09-28'}],transactions:[],payments:[],bills:[{id:'bill',name:'Phone',amount:100,accountId:'checking',frequency:'monthly',nextDueDate:'2026-09-25',dueDay:25,active:true}],billPayments:[],creditScores:[],cardStatements:[{id:'statement',cardId:'card',dueDate:'2026-09-28',minimum:300,needsReview:false}],billCycles:[{id:'cycle',billId:'bill',dueDate:'2026-09-25',expectedAmount:100,actualAmount:null,needsReview:false}],adjustments:[],incomeSchedules:[],extra:0},now)

test('cash decision excludes savings and never calls a raw remainder safe to spend',()=>{
  const position=cashPosition(data(),now)
  assert.equal(position.checking,1200)
  assert.equal(position.savings,5000)
  assert.equal(position.cardMinimums,300)
  assert.equal(position.cashBills,100)
  assert.equal(position.afterKnownDues,800)
  assert.equal(position.potentialExtra,null)
})

test('a deliberate monthly essentials and buffer plan gates the extra-payment estimate',()=>{
  const saved=saveCashPlan(data(),{buffer:'200',essentialsRemaining:'450.50'},now)
  assert.equal(validateData(saved),true)
  assert.equal(cashPosition(saved,now).potentialExtra,149.5)
  assert.equal(cashPosition(saved,new Date(2026,9,1,12)).potentialExtra,null)
  assert.throws(()=>saveCashPlan(data(),{buffer:'-1',essentialsRemaining:'50'},now))
  assert.equal(validateData({...saved,cashPlan:{...saved.cashPlan,buffer:-1}}),false)
})

test('payday forecast follows checking rather than assuming savings are available for bills',()=>{
  const forecast=cashFlowForecast(data(),now)
  assert.equal(forecast.currentCash,1200)
  assert.equal(forecast.obligationsDue,400)
  assert.equal(forecast.projectedCash,800)
})
