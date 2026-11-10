import test from 'node:test'
import assert from 'node:assert/strict'
import { validateData } from '../src/lib/backup.js'
import { createBillPaymentDraft, editBillPaymentDraft, saveBillCharge } from '../src/lib/billRecording.js'
import { clearPending } from '../src/lib/clearPending.js'
import { prepareData, removeRecurringPayment, trackedObligations } from '../src/lib/finance.js'
import { installmentBalance, saveInstallmentPlan } from '../src/lib/installments.js'
import { projectedObligations } from '../src/lib/obligationProjection.js'

const now = new Date(2026, 10, 10, 12)
const tomorrow = new Date(2026, 10, 11, 12)
const fixture = () => prepareData({
  financeVersion: 1,
  accounts: [{ id:'bank', name:'Checking', type:'checking', balance:1000 }],
  transactions: [],
  payments: [],
  bills: [{ id:'bill', name:'Laptop', amount:100, frequency:'monthly', dueDay:10, nextDueDate:'2026-11-10', accountId:'bank', active:true }],
}, now)
const setup = (data, balance = 400) => saveInstallmentPlan(data, 'bill', { balance, lastDueDate:'2026-12-10' }, now)
const balance = (data, date = now) => installmentBalance(data.bills[0], data.billPayments, date)
const due = data => projectedObligations(data, now, '2027-01-31').filter(item => item.remaining > 0).map(item => [item.dateKey, item.remaining])
const pay = (data, form = {}, date = now) => saveBillCharge(data, {
  ...createBillPaymentDraft(data, data.bills[0], form.installmentExtra ? { installmentExtra:true } : undefined, date),
  amount:100, ...form,
}, date)

test('existing bill and history survive conversion and reversion, including an extra payment after the monthly bill is paid', () => {
  const original = pay(fixture())
  const converted = setup(original)
  assert.equal(balance(converted), 400)
  assert.deepEqual(converted.accounts, original.accounts)
  assert.deepEqual(converted.billPayments, original.billPayments)
  const withExtra = pay(converted, { installmentExtra:true, amount:50 })
  assert.equal(balance(withExtra), 350)
  assert.equal(withExtra.accounts[0].balance, 850)
  assert.equal(withExtra.billPayments[0].cycleId, '')
  assert.deepEqual(due(withExtra), [['2026-12-10', 100]])

  const reverted = prepareData(saveInstallmentPlan(withExtra, 'bill', null, now), now)
  assert.equal(balance(reverted), null)
  assert.deepEqual(reverted.bills, original.bills)
  assert.deepEqual(reverted.billPayments, withExtra.billPayments)
  assert.deepEqual(reverted.accounts, withExtra.accounts)
  assert.deepEqual(due(reverted), [['2026-12-10', 100], ['2027-01-10', 100]])
  assert.ok(validateData(reverted))
  const edited = saveBillCharge(reverted, { ...editBillPaymentDraft(reverted,reverted.billPayments[0]), amount:55 }, now)
  assert.equal(edited.accounts[0].balance, 845)
  assert.equal(edited.billPayments[0].cycleId, '')
})

test('pending and historical entries apply to the plan and checking independently', () => {
  let data = setup(fixture())
  data = pay(data, { installmentExtra:true, amount:40, status:'pending' })
  const id = data.billPayments[0].id
  assert.equal(balance(data), 400)
  assert.equal(data.accounts[0].balance, 1000)
  data = clearPending(data, 'bill', id, tomorrow)
  assert.equal(balance(data,tomorrow), 360)
  assert.equal(data.accounts[0].balance, 960)
  assert.equal(data.billPayments[0].id,id)
  assert.equal(data.billPayments[0].cycleId,'')
  data = pay(data, { installmentExtra:true, amount:20, historical:true, date:'2026-11-09' }, tomorrow)
  assert.equal(balance(data,tomorrow), 360)
  data = pay(data, { installmentExtra:true, amount:10, historical:true }, tomorrow)
  assert.equal(balance(data,tomorrow), 350)
  assert.equal(data.accounts[0].balance, 960)
  const undone = removeRecurringPayment(data,id,tomorrow)
  assert.equal(balance(undone,tomorrow), 390)
  assert.equal(undone.accounts[0].balance,1000)
})

test('linking a same-day Activity entry already reflected by the provider preserves cash and avoids reducing the plan twice', () => {
  const data = fixture()
  data.accounts[0].balance = 950
  data.transactions = [{ id:'recorded', accountId:'bank', kind:'purchase', merchant:'Laptop', amount:50, date:now.toISOString(), localDate:'2026-11-10' }]
  const plan = setup(data)
  const next = pay(plan, { installmentExtra:true, transactionId:'recorded', includedInPlan:plan.bills[0].installmentPlan.id })
  assert.equal(next.accounts[0].balance, 950)
  assert.equal(next.transactions.length, 0)
  assert.equal(next.billPayments[0].id, 'recorded')
  assert.equal(balance(next), 400)
})

test('estimated zero keeps obligations until provider confirmation, which is reversible and survives backup serialization', () => {
  const data = pay(setup(fixture(),100),{ amount:100, installmentExtra:true })
  assert.equal(balance(data),0)
  assert.deepEqual(due(data), [['2026-11-10',100],['2026-12-10',100]])
  assert.throws(() => setup(data,0), /Confirm that the provider/)
  const paid = saveInstallmentPlan(data,'bill',{ balance:0, confirmPayoff:true, lastDueDate:'2026-12-10' },now)
  assert.deepEqual(due(paid),[])
  assert.equal(trackedObligations(paid,now).length,0)
  const restored = prepareData(JSON.parse(JSON.stringify(paid)),now)
  assert.ok(validateData(restored))
  assert.deepEqual(restored.billPayments,data.billPayments)
  assert.deepEqual(due(setup(restored)),due(data))
  assert.equal(validateData({ ...paid, bills:[{...paid.bills[0], installmentPlan:{ ...paid.bills[0].installmentPlan, balanceCents:-1 }}] }),false)
})
