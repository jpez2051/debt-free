import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import config from '../vite.config.js'
import { validateData } from '../src/lib/backup.js'
import { cashAfterObligations, prepareData, saveLedgerTransaction } from '../src/lib/finance.js'
import { cashFlowForecast, scheduleOccurrences } from '../src/lib/incomeForecast.js'

const now=new Date(2026,8,8,12)
const fixture=()=>prepareData({financeVersion:1,accounts:[{id:'bank',name:'Checking',type:'checking',balance:1200},{id:'card',name:'Card',type:'credit',balance:3000,minimum:500}],transactions:[],payments:[],bills:[{id:'rent',name:'Rent',amount:800,accountId:'bank',frequency:'monthly',nextDueDate:'2026-09-13',dueDay:13,active:true}],billPayments:[],creditScores:[],cardStatements:[{id:'statement',cardId:'card',dueDate:'2026-09-12',minimum:500,needsReview:false}],billCycles:[{id:'rent-sep',billId:'rent',dueDate:'2026-09-13',expectedAmount:800,actualAmount:null,needsReview:false}],adjustments:[],incomeSchedules:[{id:'pay',name:'Paycheck',amount:1000,accountId:'bank',frequency:'biweekly',nextDate:'2026-09-10',active:true}],extra:0},now)

test('twice-monthly schedules honor both paydays and clamp month-end dates',()=>{
  const occurrences=scheduleOccurrences({id:'pay',name:'Paycheck',amount:1000,accountId:'bank',frequency:'semimonthly',nextDate:'2026-08-31',secondPayDay:15,active:true},{from:new Date(2026,8,1,12),days:30})
  assert.deepEqual(occurrences.map(item=>item.date),['2026-09-15','2026-09-30'])
})

test('payday forecast explains a temporary shortage without changing actual cash',()=>{
  const data=fixture(),forecast=cashFlowForecast(data,now)
  assert.equal(cashAfterObligations(data,now),-100)
  assert.equal(forecast.currentCash,1200)
  assert.equal(forecast.nextIncome.date,'2026-09-10')
  assert.equal(forecast.dueBeforeIncome,0)
  assert.equal(forecast.coverageBeforeIncome,1200)
  assert.equal(forecast.obligationsDue,1300)
  assert.equal(forecast.expectedIncome,3000)
  assert.equal(forecast.projectedCash,2900)
  assert.equal(data.accounts[0].balance,1200)
})

test('logging a linked paycheck accepts its actual amount and replaces the forecast occurrence',()=>{
  const original=fixture(),posted=saveLedgerTransaction(original,{accountId:'bank',merchant:'Employer',amount:975,date:'2026-09-10',historical:false,incomeScheduleId:'pay',scheduledIncomeDate:'2026-09-10'},'income',new Date(2026,8,10,12)),forecast=cashFlowForecast(posted,new Date(2026,8,10,12))
  assert.equal(posted.accounts[0].balance,2175)
  assert.equal(forecast.expectedIncome,2000)
  assert.equal(forecast.projectedCash,2875)
  assert.equal(validateData(posted),true)
  assert.deepEqual(prepareData(posted,new Date(2026,8,10,12)),posted)
})

test('v0.10.1 renders a responsive forecast and income-schedule matching',async()=>{
  const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),output=config.plugins[0].transform(source,'/src/App.jsx')
  assert.match(output,/const VERSION='0\.10\.1'/)
  assert.match(output,/<IncomeForecast data=\{data\} update=\{update\} onConfirmIncome=\{confirmExpectedIncome\}/)
  assert.match(output,/Expected income schedule/)
  assert.match(output,/nextOccurrenceForSchedule/)
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:IncomeForecast}=await server.ssrLoadModule('/src/IncomeForecast.jsx')
    const html=renderToStaticMarkup(React.createElement(IncomeForecast,{data:fixture(),update(){}}))
    for(const text of ['Payday forecast','Next expected deposit','$1,000.00','Due before payday','$0.00','Projected 30-day cash','$2,900.00','Forecast only'])assert.ok(html.includes(text),text)
  }finally{await server.close()}
})
