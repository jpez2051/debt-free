export function normalizeDebt(debt) {
  return {
    ...debt,
    balance: Math.max(0, Number(debt.balance) || 0),
    apr: Math.max(0, Number(debt.apr) || 0),
    minimum: Math.max(0, Number(debt.minimum) || 0),
  }
}

export function orderDebts(debts, strategy = 'avalanche') {
  return [...debts].map(normalizeDebt).sort((a, b) => {
    if (strategy === 'snowball') return a.balance - b.balance || b.apr - a.apr
    return b.apr - a.apr || a.balance - b.balance
  })
}

export function simulatePayoff(debts, extra = 0, strategy = 'avalanche', maxMonths = 1200) {
  const items = debts.map(normalizeDebt)
  const monthlyExtra = Math.max(0, Number(extra) || 0)
  let months = 0
  let interest = 0
  const timeline = [items.reduce((sum, debt) => sum + debt.balance, 0)]

  if (!items.length || timeline[0] <= 0) {
    return { months: 0, interest: 0, timeline, paidOff: true }
  }

  while (items.some((debt) => debt.balance > 0.005) && months < maxMonths) {
    months += 1

    for (const debt of items) {
      if (debt.balance <= 0) continue
      const monthlyInterest = debt.balance * (debt.apr / 100 / 12)
      debt.balance += monthlyInterest
      interest += monthlyInterest
    }

    // Minimums are always paid first. Any unused minimum from a debt that
    // finishes this month rolls into the attack payment in the same month.
    let attackBudget = monthlyExtra
    for (const debt of items) {
      if (debt.balance <= 0) continue
      const scheduled = Math.min(debt.minimum, debt.balance)
      debt.balance -= scheduled
      attackBudget += Math.max(0, debt.minimum - scheduled)
    }

    const targets = orderDebts(items.filter((debt) => debt.balance > 0.005), strategy)
    for (const target of targets) {
      if (attackBudget <= 0) break
      const live = items.find((debt) => debt.id === target.id)
      const payment = Math.min(attackBudget, live.balance)
      live.balance -= payment
      attackBudget -= payment
    }

    timeline.push(items.reduce((sum, debt) => sum + Math.max(0, debt.balance), 0))

    // A plan with no effective payment can never amortize. Stop cleanly
    // instead of looping for 100 years and pretending it is a payoff date.
    const effectivePayment = items.reduce((sum, debt) => sum + debt.minimum, 0) + monthlyExtra
    if (effectivePayment <= 0) break
  }

  const paidOff = items.every((debt) => debt.balance <= 0.005)
  return { months, interest, timeline, paidOff }
}

export function projectedDate(months, from = new Date()) {
  if (!Number.isFinite(months) || months < 0) return null
  const result = new Date(from)
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  return result
}
