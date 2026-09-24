import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { paymentEffortRows, paymentEffortSummary } from '../src/lib/paymentEffort.js'
import { recordCardPayment, statementTotals } from '../src/lib/finance.js'

const now=new Date(2026,8,23,12)
const fixture=()=>({
  accounts:[{id:'card',name:'Fictional Card',type:'credit'},{id:'bank',name:'Checking',type:'checking'}],
  cardStatements:[
    {id:'aug',cardId:'card',dueDate:'2026-08-26',minimum:90,needsReview:false},
    {id:'sep',cardId:'card',dueDate:'2026-09-26',minimum:80,needsReview:false},
    {id:'oct',cardId:'card',dueDate:'2026-10-26',minimum:75,needsReview:true},
  ],
  payments:[
    {id:'aug-pay',cardId:'card',statementId:'aug',assignmentStatus:'confirmed',amount:50,localDate:'2026-08-20'},
    {id:'sep-one',cardId:'card',statementId:'sep',assignmentStatus:'confirmed',amount:500,localDate:'2026-09-08'},
    {id:'sep-two',cardId:'card',statementId:'sep',assignmentStatus:'confirmed',amount:500,localDate:'2026-09-22',historical:true},
    {id:'general',cardId:'card',statementId:'',assignmentStatus:'extra',amount:300,localDate:'2026-09-21'},
    {id:'unassigned',cardId:'card',statementId:'',assignmentStatus:'unassigned',amount:100,localDate:'2026-09-21'},
    {id:'future',cardId:'card',statementId:'sep',assignmentStatus:'confirmed',amount:100,localDate:'2026-09-27'},
    {id:'unreviewed',cardId:'card',statementId:'oct',assignmentStatus:'confirmed',amount:200,localDate:'2026-09-20'},
  ],
})

test('two payments in one confirmed cycle show the amount above its minimum without double counting',()=>{
  const rows=paymentEffortRows(fixture(),now)
  assert.deepEqual(rows.map(row=>[row.statementId,row.paid,row.minimum,row.aboveMinimum]),[['sep',1000,80,920],['aug',50,90,0]])
  assert.deepEqual(paymentEffortSummary(rows),{cycles:2,paid:1050,aboveMinimum:920})
})

test('an additional September payment increases September above-minimum effort, not October minimum',()=>{
  const data={financeVersion:1,accounts:[{id:'card',name:'Card',type:'credit',balance:9500,minimum:500,nextDueDate:'2026-10-20'},{id:'bank',name:'Checking',type:'checking',balance:3000}],cardStatements:[{id:'sep',cardId:'card',dueDate:'2026-09-20',minimum:500,needsReview:false},{id:'oct',cardId:'card',dueDate:'2026-10-20',minimum:450,needsReview:false}],payments:[{id:'minimum',cardId:'card',bankId:'bank',amount:500,date:'2026-09-19T12:00:00Z',localDate:'2026-09-19',statementId:'sep',assignmentStatus:'confirmed'}],transactions:[],bills:[]}
  const result=recordCardPayment(data,{cardId:'card',bankId:'bank',amount:1000,date:'2026-09-23',statementId:'sep'},now)
  assert.equal(result.accounts.find(account=>account.id==='card').balance,8500)
  assert.equal(result.accounts.find(account=>account.id==='bank').balance,2000)
  assert.equal(statementTotals(result.cardStatements[0],result.payments,now).actualPaid,1500)
  assert.equal(statementTotals(result.cardStatements[1],result.payments,now).remaining,450)
  assert.deepEqual(paymentEffortRows(result,now).map(row=>[row.dueDate,row.aboveMinimum]),[['2026-09-20',1000]])
})

test('reallocating a payment changes the insight but not the original payment or balances',()=>{
  const data=fixture(),before=structuredClone(data)
  data.payments.find(payment=>payment.id==='general').statementId='sep'
  data.payments.find(payment=>payment.id==='general').assignmentStatus='confirmed'
  assert.equal(paymentEffortRows(data,now)[0].aboveMinimum,1220)
  assert.deepEqual(data.accounts,before.accounts)
  assert.deepEqual(data.payments.map(payment=>payment.amount),before.payments.map(payment=>payment.amount))
})

test('unreviewed, superseded, and moved statement months do not produce misleading above-minimum totals',()=>{
  const data=fixture()
  data.cardStatements.find(statement=>statement.id==='aug').supersededBy='sep'
  data.cardStatements.find(statement=>statement.id==='sep').id='statement-card-2026-08-26'
  data.payments.filter(payment=>payment.statementId==='sep').forEach(payment=>{payment.statementId='statement-card-2026-08-26';payment.cycleDueDateBefore='2026-08-26'})
  assert.deepEqual(paymentEffortRows(data,now),[])
})

test('Debts presents the calculated insight without changing the saved payoff-plan extra',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/<PaymentEffort data=\{data\}/)
  assert.match(app,/paymentIntent==='extra'/)
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try {
    const {default:PaymentEffort}=await server.ssrLoadModule('/src/PaymentEffort.jsx')
    const html=renderToStaticMarkup(React.createElement(PaymentEffort,{data:fixture(),now}))
    for(const label of ['Payments above minimum','$920.00','Fictional Card','statement cycle','not interest saved'])assert.ok(html.includes(label),label)
  }finally {await server.close()}
})
