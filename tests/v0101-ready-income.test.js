import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { nextOccurrenceForSchedule, readyIncomeOccurrences } from '../src/lib/incomeForecast.js'
import { incomeLinkAheadOfDeposit, saveLedgerTransaction } from '../src/lib/finance.js'

const schedule={id:'pay',name:'Paycheck',amount:1000,accountId:'bank',frequency:'biweekly',nextDate:'2026-09-10',active:true}
const data=(transactions=[])=>({accounts:[{id:'bank',name:'Checking',type:'checking',balance:1200}],transactions,incomeSchedules:[schedule],payments:[],bills:[],billPayments:[],creditScores:[],cardStatements:[],billCycles:[],adjustments:[],extra:0,financeVersion:1})

test('the latest due paycheck stays ready until that occurrence is confirmed',()=>{
  assert.deepEqual(readyIncomeOccurrences(data(),new Date(2026,8,11,12)).map(item=>item.date),['2026-09-10'])
  const recorded={id:'income',kind:'income',incomeScheduleId:'pay',scheduledIncomeDate:'2026-09-10',date:'2026-09-10T12:00:00.000Z',localDate:'2026-09-10',accountId:'bank',merchant:'Employer',amount:975}
  assert.deepEqual(readyIncomeOccurrences(data([recorded]),new Date(2026,8,11,12)),[])
  assert.equal(nextOccurrenceForSchedule(schedule,[recorded],new Date(2026,8,11,12)).date,'2026-09-24')
})

test('manual schedule selection prefers an overdue unconfirmed paycheck',()=>{
  assert.equal(nextOccurrenceForSchedule(schedule,[],new Date(2026,8,11,12)).date,'2026-09-10')
})

test('a prior deposit cannot silently claim a future payday, and unlinking preserves balances',()=>{
  const old={id:'aug',kind:'income',date:'2026-08-27T12:00:00.000Z',localDate:'2026-08-27',merchant:'Employer',amount:1000,accountId:'bank',historical:false,incomeScheduleId:'pay',scheduledIncomeDate:'2026-09-24'}
  const september={id:'sep',kind:'income',date:'2026-09-10T12:00:00.000Z',localDate:'2026-09-10',merchant:'Employer',amount:1000,accountId:'bank',historical:false,incomeScheduleId:'pay',scheduledIncomeDate:'2026-09-10'}
  const source=data([old,september]),today=new Date(2026,8,22,12)
  assert.equal(nextOccurrenceForSchedule(schedule,source.transactions,today).date,'2026-10-08')
  assert.equal(incomeLinkAheadOfDeposit(old.scheduledIncomeDate,old.localDate),true)
  assert.throws(()=>saveLedgerTransaction(source,{...old,date:'2026-08-27'},'income',today),/future paycheck is not marked received/)
  const corrected=saveLedgerTransaction(source,{...old,date:'2026-08-27',incomeScheduleId:'',scheduledIncomeDate:''},'income',today)
  assert.equal(corrected.accounts[0].balance,source.accounts[0].balance)
  assert.equal(corrected.transactions.find(t=>t.id==='aug').amount,old.amount)
  assert.equal(nextOccurrenceForSchedule(schedule,corrected.transactions,today).date,'2026-09-24')
})

test('a mismatched payday is flagged with a direct review action',async()=>{
  const old={id:'aug',kind:'income',date:'2026-08-27T12:00:00.000Z',localDate:'2026-08-27',merchant:'Employer',amount:1000,accountId:'bank',incomeScheduleId:'pay',scheduledIncomeDate:'2026-09-24'}
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:IncomeForecast}=await server.ssrLoadModule('/src/IncomeForecast.jsx')
    const html=renderToStaticMarkup(React.createElement(IncomeForecast,{data:data([old]),update(){},onReviewIncome(){},now:new Date(2026,8,22,12)}))
    assert.match(html,/A deposit recorded Aug 27, 2026 is linked to the Sep 24, 2026 payday/)
    assert.match(html,/Review income link/)
  }finally{await server.close()}
})

test('a confirmed payday advances the visible schedule to the next unconfirmed date',async()=>{
  const recorded={id:'income',kind:'income',incomeScheduleId:'pay',scheduledIncomeDate:'2026-09-10',date:'2026-09-10T12:00:00.000Z',localDate:'2026-09-10',accountId:'bank',merchant:'Employer',amount:975}
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:IncomeForecast}=await server.ssrLoadModule('/src/IncomeForecast.jsx')
    const html=renderToStaticMarkup(React.createElement(IncomeForecast,{data:data([recorded]),update(){},now:new Date(2026,8,22,12)}))
    assert.match(html,/Next expected Sep 24, 2026/)
    assert.doesNotMatch(html,/next Sep 10, 2026/)
    assert.doesNotMatch(html,/READY TO CONFIRM/)
  }finally{await server.close()}
})

test('dashboard reporting controls sit outside the payday panel and above reporting totals',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  const forecast=await readFile(new URL('../src/IncomeForecast.jsx',import.meta.url),'utf8')
  assert.match(app,/<IncomeForecast data=\{data\} update=\{update\} onConfirmIncome=\{confirmExpectedIncome\} onReviewIncome=\{openIncome\}\/><PeriodPicker value=\{reportPeriod\} onChange=\{setReportPeriod\}\/><section className="stats four">/)
  assert.doesNotMatch(forecast,/reporting-period-anchor/)
})

test('ready-to-confirm UI and prefilled income handoff ship in v0.11.0',async()=>{
  const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),output=source
  assert.match(output,/const VERSION='/)
  assert.match(output,/const confirmExpectedIncome=/)
  assert.match(output,/amount:schedule\.amount/)
  assert.match(output,/scheduledIncomeDate:occurrence\.date/)
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:IncomeForecast}=await server.ssrLoadModule('/src/IncomeForecast.jsx')
    const html=renderToStaticMarkup(React.createElement(IncomeForecast,{data:data(),update(){},onConfirmIncome(){},now:new Date(2026,8,11,12)}))
    for(const text of ['READY TO CONFIRM','Paycheck · $1,000.00','Expected Sep 10, 2026','Confirm or edit amount'])assert.ok(html.includes(text),text)
  }finally{await server.close()}
})
