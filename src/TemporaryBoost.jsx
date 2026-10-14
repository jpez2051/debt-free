import { useMemo, useState } from 'react'
import { temporaryBoostProjection } from './lib/temporaryBoost.js'
import { projectedDate } from './lib/payoff.js'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export default function TemporaryBoost({ budget, strategy, baseline, amount: savedAmount, months: savedMonths, onAmountChange, onMonthsChange }) {
  const [localAmount, setLocalAmount] = useState('')
  const [localMonths, setLocalMonths] = useState('3')
  const amount = savedAmount ?? localAmount
  const months = savedMonths ?? localMonths
  const setAmount = onAmountChange || setLocalAmount
  const setMonths = onMonthsChange || setLocalMonths
  const preview = useMemo(() => temporaryBoostProjection(budget, amount, months, strategy, baseline), [budget, amount, months, strategy, baseline])
  return <section className="panel content-panel payoff-scenario" aria-labelledby="temporary-boost-title">
    <span className="kicker">WHAT IF?</span>
    <h2 id="temporary-boost-title">Try a temporary payment boost</h2>
    <p className="muted">Model a short-term push without changing your saved monthly plan.</p>
    <div className="form-row">
      <label className="field">Extra boost each month
        <div className="money-input"><span aria-hidden="true">$</span><input type="number" inputMode="decimal" min="0" step=".01" value={amount} aria-describedby="temporary-boost-help temporary-boost-feedback" onChange={event => setAmount(event.target.value)} /></div>
      </label>
      <label className="field">For how many months
        <input type="number" inputMode="numeric" min="1" max="1200" step="1" value={months} aria-describedby="temporary-boost-help temporary-boost-feedback" onChange={event => setMonths(event.target.value)} />
      </label>
    </div>
    <p id="temporary-boost-help" className="muted">Added on top of your planned monthly payment for the selected number of months. This does not record a payment.</p>
    <div id="temporary-boost-feedback" role="status" aria-live="polite">
      {preview.error && <p className="warning-text">{preview.error}</p>}
      {preview.noDebt && <p>No outstanding card debt to model.</p>}
      {preview.result && <div className="scenario-result">
        <strong>{preview.result.paidOff ? projectedDate(preview.result.months)?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'No payoff date under this boost'}</strong>
        <span>{preview.comparable ? `${preview.monthsSaved} month${preview.monthsSaved === 1 ? '' : 's'} sooner · about ${money.format(preview.interestSaved)} less interest` : preview.result.paidOff ? 'Creates a payoff path. Your original plan has no payoff date, so savings cannot be compared.' : 'The boost still does not eliminate the modeled debt. No time or interest savings comparison is available.'}</span>
      </div>}
    </div>
  </section>
}
