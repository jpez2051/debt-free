import { calendarDate, cents, dollars, localDate, transactionDay } from './finance.js'

export function scheduledBillDate(bill, date) {
  const plan = bill.installmentPlan
  return !plan?.paidOff && (!plan?.lastDueDate || date <= plan.lastDueDate) &&
    (!bill.cancelFrom || date < bill.cancelFrom)
}

export function validInstallmentPlan(plan) {
  return Boolean(plan && typeof plan.id === 'string' && plan.id &&
    calendarDate(plan.date) && Number.isSafeInteger(plan.balanceCents) && plan.balanceCents >= 0 &&
    (plan.lastDueDate === '' || calendarDate(plan.lastDueDate)) &&
    typeof plan.paidOff === 'boolean' && (!plan.paidOff || plan.balanceCents === 0) &&
    Array.isArray(plan.includedIds) && plan.includedIds.every(id => typeof id === 'string' && id) &&
    new Set(plan.includedIds).size === plan.includedIds.length)
}

export function saveInstallmentPlan(data, billId, form, now = new Date()) {
  const bill = data.bills.find(item => item.id === billId)
  if (!bill) throw Error('This bill no longer exists.')
  const { installmentPlan, ...schedule } = bill
  if (form === null) {
    return { ...data, bills: data.bills.map(item => item.id === billId ? schedule : item) }
  }
  const balance = Number(form.balance)
  const balanceCents = cents(balance)
  if (String(form.balance ?? '').trim() === '' || balance < 0 ||
    !Number.isSafeInteger(balanceCents) || Math.abs(balance * 100 - balanceCents) > 0.00001) {
    throw Error('Enter a remaining balance with at most two decimal places.')
  }
  if (form.lastDueDate && !calendarDate(form.lastDueDate)) throw Error('Choose a valid last scheduled due date.')
  if (balanceCents === 0 && !form.confirmPayoff) throw Error('Confirm that the provider shows the plan is paid off.')
  const date = localDate(now)
  const includedIds = (data.billPayments || [])
    .filter(payment => payment.billId === billId && payment.status !== 'pending' && transactionDay(payment) === date)
    .map(payment => payment.id)
  const plan = { id: crypto.randomUUID(), date, balanceCents, lastDueDate: form.lastDueDate || '', paidOff: balanceCents === 0, includedIds }
  return { ...data, bills: data.bills.map(item => item.id === billId ? { ...item, installmentPlan: plan } : item) }
}

export function installmentBalance(bill, payments, now = new Date()) {
  const plan = bill.installmentPlan
  if (!plan || plan.paidOff) return plan ? 0 : null
  const today = localDate(now)
  const included = new Set(plan.includedIds)
  const applied = payments.reduce((total, payment) => {
    if (payment.billId !== bill.id || payment.status === 'pending') return total
    const day = transactionDay(payment)
    if (day < plan.date || day > today || included.has(payment.id) || payment.includedInPlan === plan.id) return total
    return total + cents(payment.amount)
  }, 0)
  return dollars(Math.max(0, plan.balanceCents - applied))
}
