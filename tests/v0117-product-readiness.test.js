import test from 'node:test'
import assert from 'node:assert/strict'
import { cloudFingerprint } from '../src/lib/cloudSync.js'
import { simulatePayoffSchedule } from '../src/lib/payoff.js'
import { reconcileAccount } from '../src/lib/finance.js'

test('cloud fingerprints do not change when equivalent object keys are rearranged',()=>{
  assert.equal(cloudFingerprint({b:2,a:{z:1,y:[3]}}),cloudFingerprint({a:{y:[3],z:1},b:2}))
})

test('a temporary payoff boost improves a payoff plan without changing the permanent extra',()=>{
  const debts=[{id:'one',balance:2000,apr:25,minimum:80},{id:'two',balance:4000,apr:20,minimum:120}]
  const base=simulatePayoffSchedule(debts,()=>100,'avalanche')
  const boost=simulatePayoffSchedule(debts,month=>month<=3?600:100,'avalanche')
  assert.ok(boost.months<base.months)
})

test('reconciling an already matching balance records the check without adding a false adjustment',()=>{
  const source={accounts:[{id:'cash',name:'Checking',type:'checking',balance:100}],transactions:[],payments:[],bills:[],adjustments:[]}
  const result=reconcileAccount(source,{accountId:'cash',balance:'100',reason:'Matched bank'})
  assert.equal(result.adjustments.length,0)
  assert.ok(result.accounts[0].reconciledAt)
})
