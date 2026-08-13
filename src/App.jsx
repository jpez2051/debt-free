import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, CreditCard, Gauge, Plus, ShieldCheck, Sparkles, Target, Trash2, WalletCards, X } from 'lucide-react'

const starterDebts = [
  { id: crypto.randomUUID(), name: 'Credit Card', balance: 4200, apr: 24.99, minimum: 135 },
  { id: crypto.randomUUID(), name: 'Car Loan', balance: 11800, apr: 6.49, minimum: 360 },
  { id: crypto.randomUUID(), name: 'Student Loan', balance: 17400, apr: 4.75, minimum: 210 },
]

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function loadDebts() {
  try { return JSON.parse(localStorage.getItem('debt-free-debts')) || starterDebts } catch { return starterDebts }
}

function monthsToPayoff(debts, extra, strategy) {
  let items = debts.map(d => ({ ...d }))
  let months = 0
  let interest = 0
  while (items.some(d => d.balance > 0.01) && months < 1200) {
    months++
    for (const d of items) {
      if (d.balance <= 0) continue
      const monthlyInterest = d.balance * (d.apr / 100 / 12)
      d.balance += monthlyInterest
      interest += monthlyInterest
    }
    let budget = items.reduce((sum, d) => sum + (d.balance > 0 ? Math.min(d.minimum, d.balance) : 0), 0) + Number(extra || 0)
    for (const d of items) {
      if (d.balance <= 0) continue
      const p = Math.min(d.minimum, d.balance, budget)
      d.balance -= p
      budget -= p
    }
    const open = items.filter(d => d.balance > 0).sort((a,b) => strategy === 'avalanche' ? b.apr-a.apr : a.balance-b.balance)
    for (const d of open) {
      if (budget <= 0) break
      const p = Math.min(budget, d.balance)
      d.balance -= p
      budget -= p
    }
  }
  return { months, interest }
}

export default function App() {
  const [debts, setDebts] = useState(loadDebts)
  const [strategy, setStrategy] = useState('avalanche')
  const [extra, setExtra] = useState(250)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name:'', balance:'', apr:'', minimum:'' })

  const save = next => { setDebts(next); localStorage.setItem('debt-free-debts', JSON.stringify(next)) }
  const total = debts.reduce((s,d) => s + Number(d.balance), 0)
  const minimums = debts.reduce((s,d) => s + Number(d.minimum), 0)
  const plan = useMemo(() => monthsToPayoff(debts, extra, strategy), [debts, extra, strategy])
  const alt = useMemo(() => monthsToPayoff(debts, extra, strategy === 'avalanche' ? 'snowball' : 'avalanche'), [debts, extra, strategy])
  const ordered = [...debts].sort((a,b) => strategy === 'avalanche' ? b.apr-a.apr : a.balance-b.balance)
  const payoffDate = new Date(); payoffDate.setMonth(payoffDate.getMonth() + plan.months)

  const addDebt = e => {
    e.preventDefault()
    if (!form.name || !form.balance || !form.minimum) return
    save([...debts, { id: crypto.randomUUID(), name:form.name, balance:Number(form.balance), apr:Number(form.apr || 0), minimum:Number(form.minimum) }])
    setForm({ name:'', balance:'', apr:'', minimum:'' }); setShowAdd(false)
  }

  return <div className="app">
    <header><div className="brand"><div className="mark"><Target size={22}/></div><div><strong>Debt Free</strong><span>Own your finish line.</span></div></div><div className="privacy"><ShieldCheck size={16}/> Your data stays on this device</div></header>
    <main>
      <section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> YOUR PAYOFF COMMAND CENTER</div><h1>Make debt feel<br/><em>finite.</em></h1><p>See every balance, choose your strategy, and turn your monthly effort into a date you can circle.</p></div><div className="freedom-card"><span>Projected debt-free date</span><strong>{payoffDate.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><div className="line"><span>{plan.months} months to go</span><span>{money.format(plan.interest)} est. interest</span></div></div></section>

      <section className="stats">
        <div><span>Total debt</span><strong>{money.format(total)}</strong><small>Across {debts.length} account{debts.length===1?'':'s'}</small></div>
        <div><span>Monthly plan</span><strong>{money.format(minimums + Number(extra || 0))}</strong><small>{money.format(minimums)} minimums + extra</small></div>
        <div><span>Strategy</span><strong className="capitalize">{strategy}</strong><small>{strategy==='avalanche'?'Highest APR first':'Smallest balance first'}</small></div>
      </section>

      <section className="grid">
        <div className="panel debts-panel"><div className="panel-head"><div><span className="kicker">YOUR DEBTS</span><h2>Payoff queue</h2></div><button className="primary" onClick={()=>setShowAdd(true)}><Plus size={17}/> Add debt</button></div>
          {ordered.length === 0 ? <div className="empty"><WalletCards/><h3>No debts added</h3><p>Add an account to build your payoff plan.</p></div> : ordered.map((d,i)=><div className="debt" key={d.id}><div className="rank">{i+1}</div><div className="debt-main"><div className="debt-title"><strong>{d.name}</strong><span>{d.apr}% APR</span></div><div className="bar"><i style={{width:`${Math.max(8,(d.balance/Math.max(...debts.map(x=>x.balance)))*100)}%`}}/></div><div className="debt-meta"><span>{money.format(d.balance)} balance</span><span>{money.format(d.minimum)}/mo minimum</span></div></div><button className="icon" aria-label="Delete debt" onClick={()=>save(debts.filter(x=>x.id!==d.id))}><Trash2 size={16}/></button></div>)}
        </div>

        <aside>
          <div className="panel strategy"><span className="kicker">PAYOFF METHOD</span><h2>Choose your attack</h2><button className={strategy==='avalanche'?'choice active':'choice'} onClick={()=>setStrategy('avalanche')}><div><ArrowDown/><strong>Avalanche</strong></div><span>Highest interest first</span>{strategy==='avalanche'&&<Check/>}</button><button className={strategy==='snowball'?'choice active':'choice'} onClick={()=>setStrategy('snowball')}><div><ArrowUp/><strong>Snowball</strong></div><span>Smallest balance first</span>{strategy==='snowball'&&<Check/>}</button>
            <div className="extra"><label htmlFor="extra">Extra payment each month</label><div className="money-input"><span>$</span><input id="extra" type="number" min="0" value={extra} onChange={e=>setExtra(e.target.value)}/></div><small>Added on top of all minimum payments.</small></div>
          </div>
          <div className="panel insight"><div className="insight-icon"><Gauge/></div><div><span className="kicker">PLAN INSIGHT</span><p>{plan.interest <= alt.interest ? `This plan saves about ${money.format(Math.max(0,alt.interest-plan.interest))} in interest versus the alternative.` : `The alternative could save about ${money.format(plan.interest-alt.interest)} in interest.`}</p></div></div>
        </aside>
      </section>
    </main>

    {showAdd && <div className="modal-backdrop" onMouseDown={()=>setShowAdd(false)}><form className="modal" onSubmit={addDebt} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close" onClick={()=>setShowAdd(false)}><X/></button><span className="kicker">NEW ACCOUNT</span><h2>Add a debt</h2><p>Enter the current numbers from your latest statement.</p><label>Account name<input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Visa card"/></label><div className="form-row"><label>Balance<input type="number" min="0" step=".01" value={form.balance} onChange={e=>setForm({...form,balance:e.target.value})} placeholder="0.00"/></label><label>APR %<input type="number" min="0" step=".01" value={form.apr} onChange={e=>setForm({...form,apr:e.target.value})} placeholder="0.00"/></label></div><label>Minimum monthly payment<input type="number" min="0" step=".01" value={form.minimum} onChange={e=>setForm({...form,minimum:e.target.value})} placeholder="0.00"/></label><button className="primary submit"><CreditCard size={17}/> Add to my plan</button></form></div>}
  </div>
}
