import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeDebt, orderDebts, projectedDate, simulatePayoff } from '../src/lib/payoff.js'

test('normalizes negative and string values safely', () => {
  assert.deepEqual(normalizeDebt({ id: 'a', balance: '100', apr: '-4', minimum: '25' }), {
    id: 'a', balance: 100, apr: 0, minimum: 25,
  })
})

test('avalanche targets highest APR while snowball targets smallest balance', () => {
  const debts = [
    { id: 'a', balance: 500, apr: 10, minimum: 25 },
    { id: 'b', balance: 100, apr: 5, minimum: 25 },
  ]
  assert.equal(orderDebts(debts, 'avalanche')[0].id, 'a')
  assert.equal(orderDebts(debts, 'snowball')[0].id, 'b')
})

test('zero-interest debt pays off in expected number of months', () => {
  const result = simulatePayoff([{ id: 'a', balance: 1200, apr: 0, minimum: 100 }], 0, 'avalanche')
  assert.equal(result.months, 12)
  assert.equal(result.interest, 0)
  assert.equal(result.paidOff, true)
})

test('extra payments accelerate payoff', () => {
  const debts = [{ id: 'a', balance: 1200, apr: 0, minimum: 100 }]
  assert.ok(simulatePayoff(debts, 100).months < simulatePayoff(debts, 0).months)
})

test('freed minimum payments roll forward after a debt is eliminated', () => {
  const debts = [
    { id: 'a', balance: 100, apr: 0, minimum: 100 },
    { id: 'b', balance: 500, apr: 0, minimum: 100 },
  ]
  const result = simulatePayoff(debts, 0, 'snowball')
  assert.equal(result.months, 3)
  assert.equal(result.paidOff, true)
})

test('avalanche does not cost more interest than snowball in representative plan', () => {
  const debts = [
    { id: 'a', balance: 5000, apr: 24, minimum: 150 },
    { id: 'b', balance: 1000, apr: 5, minimum: 50 },
  ]
  const avalanche = simulatePayoff(debts, 200, 'avalanche')
  const snowball = simulatePayoff(debts, 200, 'snowball')
  assert.ok(avalanche.interest <= snowball.interest)
})

test('empty plan is immediately paid off', () => {
  const result = simulatePayoff([], 250)
  assert.equal(result.months, 0)
  assert.equal(result.paidOff, true)
})

test('a plan with no payment budget reports that it cannot pay off', () => {
  const result = simulatePayoff([{ id: 'a', balance: 100, apr: 10, minimum: 0 }], 0)
  assert.equal(result.months, 0)
  assert.equal(result.paidOff, false)
})

test('projectedDate advances by calendar months', () => {
  const date = projectedDate(3, new Date('2026-08-12T12:00:00Z'))
  assert.equal(date.getUTCFullYear(), 2026)
  assert.equal(date.getUTCMonth(), 10)
})
