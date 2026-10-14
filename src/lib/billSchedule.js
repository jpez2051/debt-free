import { calendarDate, cents, dollars, dueInMonth, localDate } from './finance.js'

export function billScheduleSegments(bill, cycles = []) {
  const earliest = cycles.filter(cycle => cycle.billId === bill.id).map(cycle => cycle.dueDate).filter(calendarDate).sort()[0]
  const anchorDate = bill.recurrenceAnchorDate || (bill.frequency === 'annual' ? bill.nextDueDate : earliest || bill.scheduleStartDate || bill.nextDueDate)
  const current = {
    effectiveDate: bill.scheduleEffectiveDate || bill.scheduleStartDate || earliest || bill.nextDueDate,
    anchorDate,
    frequency: bill.frequency === 'annual' ? 'annual' : 'monthly',
    dueDay: (bill.frequency === 'annual' ? Number(anchorDate?.slice(8)) : Number(bill.dueDay)) || Number(anchorDate?.slice(8)) || 1,
    amount: Number(bill.amount),
  }
  return [...(bill.scheduleHistory || []), current].filter(segment => calendarDate(segment.anchorDate) && calendarDate(segment.effectiveDate))
}

export function billCadenceChange(old, form) {
  if (!old || !calendarDate(form.nextDueDate || old.nextDueDate)) return false
  const date = form.nextDueDate || old.nextDueDate
  const frequency = form.frequency === 'annual' ? 'annual' : 'monthly'
  if (frequency !== (old.frequency === 'annual' ? 'annual' : 'monthly')) return true
  const anchor = old.recurrenceAnchorDate || old.nextDueDate
  const day = (frequency === 'annual' ? Number(anchor?.slice(8)) : Number(old.dueDay)) || Number(anchor?.slice(8)) || 1
  const month = frequency === 'annual' ? Number(anchor?.slice(5, 7)) - 1 : Number(date.slice(5, 7)) - 1
  // February clamping is not itself a change from a day-31 or leap-day cadence.
  return date !== dueInMonth(Number(date.slice(0, 4)), month, day)
}

export function billScheduleAt(bill, cycles, date) {
  return billScheduleSegments(bill, cycles).find(segment => date >= segment.effectiveDate && (!segment.until || date < segment.until)) || null
}

export function amendedBillSchedule(old, form, cycles, now = new Date()) {
  const requested = form.nextDueDate || localDate(now)
  if (!old) return { scheduleStartDate: requested, scheduleEffectiveDate: requested, recurrenceAnchorDate: requested, scheduleHistory: [] }
  const segments = billScheduleSegments(old, cycles), current = segments.at(-1)
  if (!billCadenceChange(old, form)) return {
    scheduleStartDate: old.scheduleStartDate || current?.effectiveDate || requested,
    scheduleEffectiveDate: current?.effectiveDate || requested,
    recurrenceAnchorDate: current?.anchorDate || requested,
    scheduleHistory: old.scheduleHistory || [],
  }
  const effectiveDate = form.scheduleChangeDate || localDate(now)
  if (!calendarDate(effectiveDate)) throw Error('Choose a valid date for the schedule change to take effect.')
  if (requested < effectiveDate) throw Error('The first charge on the new schedule must be on or after the change takes effect.')
  let history = (old.scheduleHistory || []).map(segment => ({ ...segment }))
  if (current && (current.effectiveDate <= localDate(now) || !history.length && effectiveDate > current.effectiveDate)) {
    if (effectiveDate < current.effectiveDate) throw Error('This change starts before the current schedule. Review the existing schedule history first.')
    if (effectiveDate > current.effectiveDate) history.push({ ...current, amount: dollars(cents(current.amount)), until: effectiveDate })
  } else if (history.length) {
    // Replace a not-yet-active planned amendment; do not briefly activate it.
    if (effectiveDate <= history.at(-1).effectiveDate) throw Error('The planned change must follow the earlier schedule’s start date.')
    history.at(-1).until = effectiveDate
  }
  return { scheduleStartDate: old.scheduleStartDate || current?.effectiveDate || effectiveDate, scheduleEffectiveDate: effectiveDate, recurrenceAnchorDate: requested, scheduleHistory: history }
}
