import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cashThroughMonthEnd, prepareData } from '../src/lib/finance.js'

const fixture=now=>prepareData({
  financeVersion:1,
  accounts:[{id:'bank',name:'Checking',type:'checking',balance:1200},{id:'card',name:'Card',type:'credit',balance:2500,minimum:500,nextDueDate:'2026-10-16'}],
  cardStatements:[
    {id:'sep',cardId:'card',dueDate:'2026-09-16',minimum:500,needsReview:false},
    {id:'oct',cardId:'card',dueDate:'2026-10-16',minimum:500,needsReview:false},
  ],
  payments:[{id:'paid-sep',cardId:'card',statementId:'sep',assignmentStatus:'confirmed',amount:500,localDate:'2026-09-10',date:'2026-09-10T12:00:00Z'}],
  bills:[{id:'rent',name:'Rent',amount:800,dueDay:5,nextDueDate:'2026-10-05',frequency:'monthly',accountId:'bank',active:true}],
  billCycles:[{id:'oct-rent',billId:'rent',dueDate:'2026-10-05',expectedAmount:800,actualAmount:null,needsReview:false}],
  billPayments:[],transactions:[],creditScores:[],adjustments:[],incomeSchedules:[],extra:0,
},now)

test('September cash excludes October dues, then includes them automatically on October 1',()=>{
  const september=new Date(2026,8,22,12),october=new Date(2026,9,1,12),data=fixture(september)
  assert.equal(cashThroughMonthEnd(data,september),1200)
  assert.equal(cashThroughMonthEnd(data,new Date(2026,8,30,12)),1200)
  assert.equal(cashThroughMonthEnd(data,october),-100)
})

test('overdue unpaid items still reduce the current-month cash estimate',()=>{
  const now=new Date(2026,8,22,12),data=fixture(now)
  data.billCycles.push({id:'old',billId:'rent',dueDate:'2026-09-05',expectedAmount:100,actualAmount:null,needsReview:false})
  assert.equal(cashThroughMonthEnd(data,now),1100)
})

test('dashboard labels its cash figure as current month while keeping the 30-day forecast',async()=>{
  const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(source,/safeToSpend=cashThroughMonthEnd\(data,cashToday\)/)
  assert.match(source,/setInterval\(\(\)=>setTodayKey\(localDate\(\)\)/)
  assert.match(source,/CASH THIS MONTH/)
  assert.match(source,/Cash after dues through/)
  assert.match(source,/<IncomeForecast data=\{data\}/)
})
