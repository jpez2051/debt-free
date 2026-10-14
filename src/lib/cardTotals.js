// Credits at one issuer do not repay debt at another issuer.
export function cardTotals(accounts) {
  const cards = accounts.filter(account => account.type === 'credit')
  const debtCents = cards.reduce((sum, card) => sum + Math.max(0, Math.round(Number(card.balance || 0) * 100)), 0)
  const creditCents = cards.reduce((sum, card) => sum + Math.max(0, -Math.round(Number(card.balance || 0) * 100)), 0)
  const limitCents = cards.reduce((sum, card) => sum + Math.max(0, Math.round(Number(card.limit || 0) * 100)), 0)
  return { debt: debtCents / 100, credits: creditCents / 100, utilization: limitCents ? Math.round(debtCents / limitCents * 100) : 0 }
}
