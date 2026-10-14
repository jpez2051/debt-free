import { cents, dollars } from './finance.js'
import { categorizeSpendingEntry } from './categories.js'
import { validateSplits } from './splitSpending.js'

const key = part => JSON.stringify([part.category, part.subcategory || ''])
export function refundNeedsAllocation(data, refund) {
  const original = data.transactions.find(t => t.id === refund.originalTransactionId && t.kind === 'purchase')
  return Boolean(original && originalParts(original).length > 1 && !refund.splits?.length && cents(refund.amount) !== cents(original.amount))
}
export function originalParts(original) {
  const parts = new Map()
  for (const raw of original.splits?.length ? original.splits : [original]) {
    const part = categorizeSpendingEntry(raw), id = key(part)
    const previous = parts.get(id)
    parts.set(id, { category: part.category, subcategory: part.subcategory || '', amount: dollars(cents(previous?.amount) + cents(part.amount)) })
  }
  return [...parts.values()]
}
export function refundReportingParts(data, refund) {
  const original = data.transactions.find(t => t.id === refund.originalTransactionId && t.kind === 'purchase')
  const others = data.transactions.filter(t => t.kind === 'refund' && t.originalTransactionId === original?.id && t.id !== refund.id)
  if (original && !others.length && cents(refund.amount) === cents(original.amount)) return originalParts(original)
  if (refund.splits?.length) return refund.splits
  if (original && originalParts(original).length === 1) return originalParts(original).map(p => ({ ...p, amount: refund.amount }))
  return [{ ...categorizeSpendingEntry(refund), amount: refund.amount }]
}
export function remainingRefundParts(data, original, excludeId) {
  const parts = originalParts(original).map(p => ({ ...p, amount: cents(p.amount) }))
  for (const refund of data.transactions.filter(t => t.kind === 'refund' && t.originalTransactionId === original.id && t.id !== excludeId)) {
    if (!refund.splits?.length && parts.length > 1 && cents(refund.amount) !== cents(original.amount)) throw Error('An earlier partial refund needs category allocation. Edit it in Refunds before recording another refund.')
    for (const part of refundReportingParts(data, refund)) {
      const target = parts.find(p => key(p) === key(categorizeSpendingEntry(part)))
      if (!target || target.amount < cents(part.amount)) throw Error('Refund categories exceed their original expense parts. Review the linked refunds first.')
      target.amount -= cents(part.amount)
    }
  }
  return parts.filter(p => p.amount > 0).map(p => ({ ...p, amount: dollars(p.amount) }))
}
export function allocateRefund(data, form, original) {
  if (!original) return validateSplits(form.splits, form.amount)
  const remaining = remainingRefundParts(data, original, form.id)
  const total = remaining.reduce((sum, p) => sum + cents(p.amount), 0)
  let parts = form.splits?.length ? validateSplits(form.splits, form.amount).map(categorizeSpendingEntry) : []
  if (!parts.length) {
    if (cents(form.amount) === total) parts = remaining
    else if (remaining.length === 1) parts = [{ ...remaining[0], amount: Number(form.amount) }]
    else throw Error('For a partial refund, enter the amount returned to each original category. The parts must equal the refund total.')
  }
  const used = new Map()
  for (const part of parts) used.set(key(part), (used.get(key(part)) || 0) + cents(part.amount))
  for (const [id, value] of used) if (value > cents(remaining.find(p => key(p) === id)?.amount)) throw Error('A refund category cannot exceed the remaining amount of that original expense part.')
  return validateSplits(parts, form.amount)
}
