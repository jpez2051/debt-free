import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { nextOccurrenceForSchedule, readyIncomeOccurrences } from '../src/lib/incomeForecast.js'

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

test('ready-to-confirm UI and prefilled income handoff ship in v0.10.3',async()=>{
  const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),output=source
  assert.match(output,/const VERSION='0\.10\.3'/)
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
