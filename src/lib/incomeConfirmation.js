import { localDate, transactionDay } from './finance.js'

export function depositsForOccurrence(data, scheduleId, date) {
  return (data.transactions || []).filter(entry => entry.kind === 'income' && entry.incomeScheduleId === scheduleId && entry.scheduledIncomeDate === date)
}

export function incomeConfirmationDraft(data, occurrence, now = new Date()) {
  const schedule = (data.incomeSchedules || []).find(item => item.id === occurrence.scheduleId)
  if (!schedule) throw Error('This income schedule no longer exists. Review the latest records.')
  const entries = depositsForOccurrence(data, schedule.id, occurrence.date)
  if (entries.some(entry => entry.status !== 'pending')) throw Error('This payday already has a recorded deposit. Edit that entry, or record any separate actual deposit without linking it to the same payday.')
  if (entries.length > 1) throw Error('This payday has multiple pending deposits. Review those entries in Activity before confirming; no deposit was chosen automatically.')
  const pending = entries[0]
  if (pending) return { ...pending, date: localDate(now), status: 'cleared', initiatedDate: pending.initiatedDate || transactionDay(pending), incomeLinkWarning: 'You are confirming the existing pending deposit. Check its actual amount and posted date; it will be recorded only once.' }
  return { date: localDate(now), historical: false, status: 'cleared', accountId: schedule.accountId, merchant: schedule.name, amount: schedule.amount, incomeScheduleId: schedule.id, scheduledIncomeDate: occurrence.date }
}
