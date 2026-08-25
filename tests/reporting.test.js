import test from 'node:test'
import assert from 'node:assert/strict'
import { filterByReportingPeriod, inReportingPeriod, reportingStart } from '../src/lib/reporting.js'

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

test('filters transactions without including future or invalid entries',()=>{
  assert.deepEqual(filterByReportingPeriod(items,'month',now).map(x=>x.id),['today','month'])
  assert.deepEqual(filterByReportingPeriod(items,'30days',now).map(x=>x.id),['today','month','thirty'])
  assert.deepEqual(filterByReportingPeriod(items,'all',now).map(x=>x.id),['today','month','thirty','old'])
  assert.equal(inReportingPeriod(items.at(-1),'all',now),false)
})
