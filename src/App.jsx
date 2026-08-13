import { useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowUp, Check, CreditCard, Download, Gauge, Pencil, Plus,
  RotateCcw, ShieldCheck, Sparkles, Target, Trash2, Trophy, Undo2, Upload,
  WalletCards, X,
} from 'lucide-react'
import { orderDebts, projectedDate, simulatePayoff } from './lib/payoff.js'

const VERSION = '0.3.0'
const STORAGE = {
  debts: 'debt-free-debts',
  payments: 'debt-free-payments',
  strategy: 'debt-free-strategy',
  extra: 'debt-free-extra',
}

const starterDebts = [
  { id: crypto.randomUUID(), name: 'Credit Card', balance: 4200, apr: 24.99, minimum: 135 },
  { id: crypto.randomUUID(), name: 'Car Loan', balance: 11800, apr: 6.49, minimum: 360 },
  { id: crypto.randomUUID(), name: 'Student Loan', balance: 17400, apr: 4.75, minimum: 210 },
]

const money = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function PayoffChart({ timeline }) {
  if (!timeline?.length || timeline.length < 2) return null
  const width = 600, height = 170, pad = 10
  const max = Math.max(...timeline, 1)
  const points = timeline.map((balance, index) => {
    const x = pad + (index / (timeline.length - 1)) * (width - pad * 2)
    const y = pad + (1 - balance / max) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return <div className="chart-wrap" aria-label="Projected debt balance over time">
    <svg viewBox={`0 0 ${width} ${height}`} role="img">
      <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".28"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
      <polygon className="chart-area" points={`${pad},${height-pad} ${points} ${width-pad},${height-pad}`} />
      <polyline className="chart-line" points={points} />
    </svg>
    <div className="chart-labels"><span>Today</span><span>Debt free</span></div>
  </div>
}

export default function App() {
  const [debts, setDebts] = useState(() => loadJson(STORAGE.debts, starterDebts))
  const [payments, setPayments] = useState(() => loadJson(STORAGE.payments, []))
  const [strategy, setStrategy] = useState(() => localStorage.getItem(STORAGE.strategy) || 'avalanche')
  const [extra, setExtraState] = useState(() => Number(localStorage.getItem(STORAGE.extra) ?? 250))
  const [modal, setModal] = useState(null)
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ name: '', balance: '', apr: '', minimum: '' })
  const [payment, setPayment] = useState({ debtId: '', amount: '' })
  const importRef = useRef(null)

  const saveDebts = (next) => { setDebts(next); localStorage.setItem(STORAGE.debts, JSON.stringify(next)) }
  const savePayments = (next) => { setPayments(next); localStorage.setItem(STORAGE.payments, JSON.stringify(next)) }
  const setExtra = (value) => { setExtraState(value); localStorage.setItem(STORAGE.extra, String(value)) }
  const chooseStrategy = (value) => { setStrategy(value); localStorage.setItem(STORAGE.strategy, value) }
  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }

  const total = debts.reduce((sum, debt) => sum + Number(debt.balance), 0)
  const minimums = debts.reduce((sum, debt) => sum + Number(debt.minimum), 0)
  const paidRecorded = payments.reduce((sum, item) => sum + Number(item.amount), 0)
  const progressBase = total + paidRecorded
  const progress = progressBase > 0 ? Math.min(100, (paidRecorded / progressBase) * 100) : 0
  const plan = useMemo(() => simulatePayoff(debts, extra, strategy), [debts, extra, strategy])
  const alt = useMemo(() => simulatePayoff(debts, extra, strategy === 'avalanche' ? 'snowball' : 'avalanche'), [debts, extra, strategy])
  const ordered = useMemo(() => orderDebts(debts, strategy), [debts, strategy])
  const payoffDate = plan.paidOff ? projectedDate(plan.months) : null
  const interestDifference = Math.abs(plan.interest - alt.interest)

  const openAdd = () => { setForm({ name: '', balance: '', apr: '', minimum: '' }); setModal('debt') }
  const openEdit = (debt) => { setForm({ ...debt }); setModal('debt') }

  const submitDebt = (event) => {
    event.preventDefault()
    const balance = Number(form.balance), apr = Number(form.apr || 0), minimum = Number(form.minimum)
    if (!form.name.trim() || !Number.isFinite(balance) || balance < 0 || !Number.isFinite(apr) || apr < 0 || !Number.isFinite(minimum) || minimum <= 0) return
    const item = { id: form.id || crypto.randomUUID(), name: form.name.trim(), balance, apr, minimum }
    saveDebts(form.id ? debts.map((debt) => debt.id === form.id ? item : debt) : [...debts, item])
    setModal(null)
    flash(form.id ? 'Debt updated.' : 'Debt added to your plan.')
  }

  const deleteDebt = (debt) => {
    if (!confirm(`Remove ${debt.name} from your plan? Payment history will be kept.`)) return
    saveDebts(debts.filter((item) => item.id !== debt.id))
    flash('Debt removed.')
  }

  const submitPayment = (event) => {
    event.preventDefault()
    const requested = Number(payment.amount)
    const debt = debts.find((item) => item.id === payment.debtId)
    if (!debt || !Number.isFinite(requested) || requested <= 0) return
    const amount = Math.min(requested, Number(debt.balance))
    if (amount <= 0) return
    saveDebts(debts.map((item) => item.id === debt.id ? { ...item, balance: Math.max(0, Number(item.balance) - amount) } : item))
    savePayments([{ id: crypto.randomUUID(), debtId: debt.id, debtName: debt.name, amount, date: new Date().toISOString() }, ...payments])
    setPayment({ debtId: '', amount: '' })
    setModal(null)
    flash(`${money.format(amount)} payment recorded.`)
  }

  const undoPayment = (item) => {
    const debt = debts.find((entry) => entry.id === item.debtId)
    if (debt) saveDebts(debts.map((entry) => entry.id === item.debtId ? { ...entry, balance: Number(entry.balance) + Number(item.amount) } : entry))
    savePayments(payments.filter((entry) => entry.id !== item.id))
    flash(debt ? 'Payment undone and balance restored.' : 'Payment removed from history.')
  }

  const exportData = () => {
    const payload = { version: VERSION, exportedAt: new Date().toISOString(), debts, payments, strategy, extra: Number(extra) }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `debt-free-backup-v${VERSION}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    flash('Backup exported.')
  }

  const importData = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!Array.isArray(parsed.debts) || !Array.isArray(parsed.payments)) throw new Error('Invalid backup')
      const cleanDebts = parsed.debts.map((debt) => ({
        id: String(debt.id || crypto.randomUUID()), name: String(debt.name || 'Debt'),
        balance: Math.max(0, Number(debt.balance) || 0), apr: Math.max(0, Number(debt.apr) || 0),
        minimum: Math.max(0, Number(debt.minimum) || 0),
      }))
      if (!confirm(`Restore ${cleanDebts.length} debt account(s) and ${parsed.payments.length} payment record(s) from this backup? This replaces current data.`)) return
      saveDebts(cleanDebts)
      savePayments(parsed.payments)
      chooseStrategy(parsed.strategy === 'snowball' ? 'snowball' : 'avalanche')
      setExtra(Math.max(0, Number(parsed.extra) || 0))
      flash('Backup restored successfully.')
    } catch {
      alert('That file is not a valid Debt Free backup.')
    }
  }

  const reset = () => {
    if (!confirm('Start fresh? This removes Debt Free debts, payments, and settings saved on this device.')) return
    Object.values(STORAGE).forEach((key) => localStorage.removeItem(key))
    setDebts([]); setPayments([]); setStrategy('avalanche'); setExtraState(250)
    flash('Fresh start created.')
  }

  return <div className="app">
    <header>
      <div className="brand"><div className="mark"><Target size={22}/></div><div><strong>Debt Free</strong><span>Own your finish line. · v{VERSION}</span></div></div>
      <div className="privacy"><ShieldCheck size={16}/> Your data stays on this device</div>
    </header>

    {notice && <div className="toast" role="status">{notice}</div>}

    <main>
      <section className="hero">
        <div><div className="eyebrow"><Sparkles size={14}/> YOUR PAYOFF COMMAND CENTER</div><h1>Make debt feel<br/><em>finite.</em></h1><p>Track balances, record real payments, compare payoff methods, and turn your monthly effort into a finish line you can see.</p></div>
        <div className="freedom-card"><span>Projected debt-free date</span><strong>{!debts.length ? 'Add your first debt' : payoffDate ? payoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Needs a payment plan'}</strong><div className="line"><span>{plan.paidOff ? `${plan.months} months to go` : 'Increase monthly payments'}</span><span>{money.format(plan.interest)} est. interest</span></div></div>
      </section>

      <section className="stats">
        <div><span>Total debt</span><strong>{money.format(total)}</strong><small>Across {debts.length} account{debts.length === 1 ? '' : 's'}</small></div>
        <div><span>Monthly plan</span><strong>{money.format(minimums + Number(extra || 0))}</strong><small>{money.format(minimums)} minimums + {money.format(Number(extra || 0))} extra</small></div>
        <div><span>Progress recorded</span><strong>{progress.toFixed(0)}%</strong><small>{money.format(paidRecorded)} in logged payments</small></div>
      </section>

      {debts.length > 0 && <section className="panel projection-panel">
        <div className="projection-copy"><span className="kicker">PROJECTED JOURNEY</span><h2>Your balance has an exit ramp.</h2><p>Based on your current balances, APRs, minimums, extra payment, and {strategy} strategy.</p></div>
        <PayoffChart timeline={plan.timeline}/>
        <div className="milestone"><Trophy size={18}/><div><span>Next milestone</span><strong>{progress < 25 ? '25% paid' : progress < 50 ? 'Halfway there' : progress < 75 ? '75% paid' : progress < 100 ? 'Final stretch' : 'Debt free'}</strong></div></div>
      </section>}

      <section className="grid">
        <div className="panel debts-panel">
          <div className="panel-head"><div><span className="kicker">YOUR DEBTS</span><h2>Payoff queue</h2></div><div className="actions"><button className="secondary" onClick={() => setModal('payment')} disabled={!debts.length}>Log payment</button><button className="primary" onClick={openAdd}><Plus size={17}/> Add debt</button></div></div>
          {ordered.length === 0 ? <div className="empty"><WalletCards/><h3>Your clean slate</h3><p>Add an account to build your personalized payoff plan.</p></div> : ordered.map((debt, index) => <div className="debt" key={debt.id}><div className="rank">{index + 1}</div><div className="debt-main"><div className="debt-title"><strong>{debt.name}</strong><span>{debt.apr}% APR</span></div><div className="bar"><i style={{ width: `${Math.max(5, (debt.balance / Math.max(...debts.map((item) => Number(item.balance)), 1)) * 100)}%` }}/></div><div className="debt-meta"><span>{money.format(debt.balance)} balance</span><span>{money.format(debt.minimum)}/mo minimum</span></div></div><button className="icon" onClick={() => openEdit(debt)} aria-label={`Edit ${debt.name}`}><Pencil size={15}/></button><button className="icon danger-icon" onClick={() => deleteDebt(debt)} aria-label={`Delete ${debt.name}`}><Trash2 size={15}/></button></div>)}

          {payments.length > 0 && <div className="history"><span className="kicker">RECENT PAYMENTS</span>{payments.slice(0, 5).map((item) => <div className="history-row" key={item.id}><span>{item.debtName}<small>{new Date(item.date).toLocaleDateString()}</small></span><div><strong>-{money.format(item.amount)}</strong><button className="icon" onClick={() => undoPayment(item)} title="Undo payment" aria-label={`Undo ${money.format(item.amount)} payment`}><Undo2 size={14}/></button></div></div>)}</div>}
        </div>

        <aside>
          <div className="panel strategy"><span className="kicker">PAYOFF METHOD</span><h2>Choose your attack</h2><button className={strategy === 'avalanche' ? 'choice active' : 'choice'} onClick={() => chooseStrategy('avalanche')}><div><ArrowDown/><strong>Avalanche</strong></div><span>Highest interest first</span>{strategy === 'avalanche' && <Check/>}</button><button className={strategy === 'snowball' ? 'choice active' : 'choice'} onClick={() => chooseStrategy('snowball')}><div><ArrowUp/><strong>Snowball</strong></div><span>Smallest balance first</span>{strategy === 'snowball' && <Check/>}</button><div className="extra"><label htmlFor="extra">Extra payment each month</label><div className="money-input"><span>$</span><input id="extra" type="number" min="0" step="1" value={extra} onChange={(event) => setExtra(event.target.value)}/></div><small>Added on top of all minimum payments.</small></div></div>

          <div className="panel insight"><div className="insight-icon"><Gauge/></div><div><span className="kicker">PLAN INSIGHT</span><p>{interestDifference < 1 ? 'Both strategies are nearly identical for this mix of debts.' : plan.interest <= alt.interest ? `Your ${strategy} plan saves about ${money.format(interestDifference)} in projected interest versus the alternative.` : `Switching strategies could save about ${money.format(interestDifference)} in projected interest.`}</p></div></div>

          <div className="panel tools"><span className="kicker">YOUR DATA</span><input ref={importRef} className="file-input" type="file" accept="application/json,.json" onChange={importData}/><button className="tool-btn" onClick={exportData}><Download size={16}/> Export backup</button><button className="tool-btn" onClick={() => importRef.current?.click()}><Upload size={16}/> Restore backup</button><button className="tool-btn danger" onClick={reset}><RotateCcw size={16}/> Start fresh</button></div>
        </aside>
      </section>
    </main>

    {modal === 'debt' && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><form className="modal" onSubmit={submitDebt} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close" onClick={() => setModal(null)} aria-label="Close"><X/></button><span className="kicker">{form.id ? 'EDIT ACCOUNT' : 'NEW ACCOUNT'}</span><h2>{form.id ? 'Update debt' : 'Add a debt'}</h2><p>Use the numbers from your latest statement.</p><label>Account name<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Visa card"/></label><div className="form-row"><label>Balance<input required type="number" min="0" step=".01" value={form.balance} onChange={(event) => setForm({ ...form, balance: event.target.value })} placeholder="0.00"/></label><label>APR %<input required type="number" min="0" step=".01" value={form.apr} onChange={(event) => setForm({ ...form, apr: event.target.value })} placeholder="0.00"/></label></div><label>Minimum monthly payment<input required type="number" min="0.01" step=".01" value={form.minimum} onChange={(event) => setForm({ ...form, minimum: event.target.value })} placeholder="0.00"/></label><button className="primary submit"><CreditCard size={17}/>{form.id ? 'Save changes' : 'Add to my plan'}</button></form></div>}

    {modal === 'payment' && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><form className="modal" onSubmit={submitPayment} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="close" onClick={() => setModal(null)} aria-label="Close"><X/></button><span className="kicker">PROGRESS</span><h2>Log a payment</h2><p>Recording a payment updates that balance and recalculates your finish line.</p><label>Debt<select required value={payment.debtId} onChange={(event) => setPayment({ ...payment, debtId: event.target.value })}><option value="">Choose an account</option>{debts.filter((debt) => Number(debt.balance) > 0).map((debt) => <option value={debt.id} key={debt.id}>{debt.name} — {money.format(debt.balance)}</option>)}</select></label><label>Payment amount<input required type="number" min="0.01" step=".01" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} placeholder="0.00"/></label><button className="primary submit">Record payment</button></form></div>}
  </div>
}
