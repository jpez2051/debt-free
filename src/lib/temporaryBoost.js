import { simulatePayoffSchedule } from './payoff.js'

export function temporaryBoostProjection(budget, amount, duration, strategy, baseline) {
  const boost = amount === '' ? 0 : Number(amount)
  const months = Number(duration)
  if (!Number.isFinite(boost) || boost < 0 || !Number.isSafeInteger(Math.round(boost * 100)) || Math.abs(boost * 100 - Math.round(boost * 100)) > 0.00001) {
    return { error: 'Enter a nonnegative dollar amount with at most two decimal places.' }
  }
  if (!Number.isInteger(months) || months < 1 || months > 1200) {
    return { error: 'Enter a whole number of months from 1 to 1,200.' }
  }
  if (!boost) return { active: false }
  if (!budget.debts.some(debt => Number(debt.balance) > 0)) return { active: true, noDebt: true }
  const result = simulatePayoffSchedule(budget.debts, month => budget.extraBudget + (month <= months ? boost : 0), strategy)
  const comparable = Boolean(baseline.paidOff && result.paidOff)
  return {
    active: true,
    result,
    comparable,
    monthsSaved: comparable ? Math.max(0, baseline.months - result.months) : null,
    interestSaved: comparable ? Math.max(0, baseline.interest - result.interest) : null,
  }
}
