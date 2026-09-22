import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareData, repairMovedStatement, saveStatement, statementCycleMismatch, statementTotals, trackedObligations, cashAfterObligations } from '../src/lib/finance.js'
import { validateData } from '../src/lib/backup.js'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const now=new Date(2026,8,22,12)
const mistaken=()=>prepareData({
  financeVersion:1,
  accounts:[{id:'card',name:'Card',type:'credit',balance:2400,minimum:263,nextDueDate:'2026-10-16'},{id:'bank',name:'Checking',type:'checking',balance:1200}],
  cardStatements:[{id:'statement-card-2026-09-16',cardId:'card',dueDate:'2026-10-16',minimum:263,needsReview:false}],
  payments:[{id:'sep-pay',cardId:'card',bankId:'bank',amount:266,date:'2026-09-09T12:00:00.000Z',localDate:'2026-09-09',historical:false,statementId:'statement-card-2026-09-16',assignmentStatus:'confirmed',cycleDueDateBefore:'2026-09-16'}],
  transactions:[],bills:[],billPayments:[],creditScores:[],billCycles:[],adjustments:[],incomeSchedules:[],extra:0,
},now)

test('a paid September statement moved to October cannot mark the October minimum met',()=>{
  const data=mistaken(),statement=data.cardStatements[0]
  assert.equal(statementCycleMismatch(statement,data.payments),'2026-09-16')
  assert.deepEqual(statementTotals(statement,data.payments,now),{required:263,actualPaid:0,paid:0,remaining:263})
  assert.equal(trackedObligations(data,now).find(item=>item.kind==='card').remaining,263)
  assert.equal(cashAfterObligations(data,now),937)
})

test('separating statement months preserves payment history and balances',()=>{
  const before=mistaken(),after=repairMovedStatement(before,before.cardStatements[0].id,266,now)
  const september=after.cardStatements.find(s=>s.dueDate==='2026-09-16'),october=after.cardStatements.find(s=>s.dueDate==='2026-10-16')
  assert.equal(statementTotals(september,after.payments,now).remaining,0)
  assert.equal(statementTotals(october,after.payments,now).remaining,263)
  assert.deepEqual(after.payments,before.payments)
  assert.deepEqual(after.accounts,before.accounts)
  assert.equal(validateData(after),true)
  assert.equal(cashAfterObligations(after,now),937)
})

test('separating months requires the original minimum rather than assuming zero',()=>{
  assert.throws(()=>repairMovedStatement(mistaken(),'statement-card-2026-09-16','',now),/Enter the original statement minimum/)
})

test('editing a paid statement into another month is blocked; adding a new month is allowed',()=>{
  const corrected=repairMovedStatement(mistaken(),'statement-card-2026-09-16',266,now)
  const september=corrected.cardStatements.find(s=>s.dueDate==='2026-09-16')
  assert.throws(()=>saveStatement(corrected,{id:september.id,cardId:'card',dueDate:'2026-11-16',minimum:240},now),/add a separate statement/)
  const november=saveStatement(corrected,{cardId:'card',dueDate:'2026-11-16',minimum:240},now)
  assert.equal(statementTotals(november.cardStatements.find(s=>s.dueDate==='2026-11-16'),november.payments,now).remaining,240)
})

test('moved statement cycles are visibly flagged in dashboard and Debts review',async()=>{
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:ReliabilityCenter}=await server.ssrLoadModule('/src/ReliabilityCenter.jsx')
    const data=mistaken(),render=page=>renderToStaticMarkup(React.createElement(ReliabilityCenter,{data,update(){},page}))
    assert.match(render('dashboard'),/upcoming minimums are treated as unpaid/)
    const debts=render('debts')
    assert.match(debts,/Payment for 2026-09-16 is still linked here/)
    assert.match(debts,/Separate statement months/)
    assert.match(debts,/\$263\.00 remaining/)
  }finally{await server.close()}
})
