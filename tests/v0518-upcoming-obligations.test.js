import test from 'node:test'
import assert from 'node:assert/strict'
import { upcomingObligations } from '../src/lib/obligations.js'

test('upcoming obligations preserve paid status without hiding card minimums',()=>{
  const result=upcomingObligations({accounts:[{id:'card',type:'credit',balance:100,minimum:25}],cards:[{id:'card',type:'credit',balance:100,minimum:25,nextDueDate:'2026-09-15'}],bills:[],payments:[{cardId:'card',amount:25,cycleDueDateBefore:'2026-09-15',date:'2026-09-01T12:00:00Z'}],billPayments:[]},new Date(2026,8,8,12))
  assert.equal(result[0].paid,25)
  assert.equal(result[0].remaining,0)
})
