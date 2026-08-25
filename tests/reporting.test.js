import test from 'node:test'
import assert from 'node:assert/strict'
import { filterByReportingPeriod, inReportingPeriod, monthlyTrend, reportingStart, trendComparison } from '../src/lib/reporting.js'

const now=new Date(2026,7,25,12)
const items=[
  {id:'today',date:'2026-08-25T12:00:00.000Z'},
  {id:'month',date:'2026-08-02T12:00:00.000Z'},
  {id:'thirty',date:'2026-07-30T12:00:00.000Z'},
  {id:'old',date:'2025-12-01T12:00:00.000Z'},
  {id:'future',date:'2026-08-26T12:00:00.000Z'},
  {id:'bad',date:'not-a-date'},
]

test('reporting periods use calendar month and inclusive 30-day windows',()=>{
  assert.equal(reportingStart('month',now).toISOString().slice(0,10),'2026-08-01')
  assert.equal(reportingStart('30days',now).toISOString().slice(0,10),'2026-07-27')
  assert.equal(reportingStart('all',now),null)
})

test('builds calendar-month spending trends and month-over-month comparison',()=>{
  const spending=[
    {date:'2026-07-08T12:00:00.000Z',amount:100},
    {date:'2026-08-02T12:00:00.000Z',amount:75},
    {date:'2026-08-20T12:00:00.000Z',amount:75},
    {date:'2026-08-26T12:00:00.000Z',amount:900},
  ]
  assert.deepEqual(monthlyTrend(spending,2,now).map(x=>[x.id,x.total]),[['2026-07',100],['2026-08',150]])
  assert.deepEqual(trendComparison(spending,now),{previous:100,current:150,change:50,percent:50})
})

test('filters transactions without including future or invalid entries',()=>{
  assert.deepEqual(filterByReportingPeriod(items,'month',now).map(x=>x.id),['today','month'])
  assert.deepEqual(filterByReportingPeriod(items,'30days',now).map(x=>x.id),['today','month','thirty'])
  assert.deepEqual(filterByReportingPeriod(items,'all',now).map(x=>x.id),['today','month','thirty','old'])
  assert.equal(inReportingPeriod(items.at(-1),'all',now),false)
})
