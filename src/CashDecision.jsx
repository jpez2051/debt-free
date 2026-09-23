import { useEffect, useState } from 'react'
import { saveCashPlan } from './lib/cashPosition.js'

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})

export default function CashDecision({data,update,position}) {
  const [buffer,setBuffer]=useState(String(position.buffer))
  const [essentials,setEssentials]=useState(position.planned?String(position.essentialsRemaining):'')
  const [error,setError]=useState('')
  useEffect(()=>{setBuffer(String(position.buffer));setEssentials(position.planned?String(position.essentialsRemaining):'')},[position.month,data.cashPlan])
  const save=event=>{
    event.preventDefault()
    try {
      const next=saveCashPlan(data,{buffer,essentialsRemaining:essentials},new Date(`${position.today}T12:00:00`))
      if(update(next)===false)throw new Error('Your plan could not be saved.')
      setError('')
    }catch(problem){setError(problem.message)}
  }
  return <section className="panel content-panel cash-decision" aria-labelledby="cash-decision-title">
    <div className="cash-decision-head"><div><span className="kicker">KNOW WHAT IS COMMITTED</span><h2 id="cash-decision-title">Checking after known dues</h2><p className="muted">A breakdown of today’s checking balance through month-end. Savings stay separate.</p></div><strong className={position.afterKnownDues<0?'cash-decision-negative':''}>{money.format(position.afterKnownDues)}</strong></div>
    <dl className="cash-decision-breakdown"><div><dt>Checking today</dt><dd>{money.format(position.checking)}</dd></div><div><dt>Unpaid card minimums</dt><dd>− {money.format(position.cardMinimums)}</dd></div><div><dt>Unpaid bills from checking</dt><dd>− {money.format(position.cashBills)}</dd></div><div className="cash-decision-total"><dt>After known dues</dt><dd>{money.format(position.afterKnownDues)}</dd></div></dl>
    {position.overdue>0&&<p className="cash-decision-note">Includes {money.format(position.overdue)} of overdue obligations.</p>}
    <p className="cash-decision-note">This is not a spending allowance: it excludes future unlogged purchases, missing bills, and any payment due after month-end. {position.savings>0?`${money.format(position.savings)} in savings is not used here.`:''}</p>
    <details className="cash-plan-details"><summary>{position.planned?'Review your buffer and essentials':'Estimate room for an extra debt payment'}</summary><p>Enter what you still expect to spend on groceries, fuel, and other essentials this month, plus a checking balance you want to protect. Update the remaining amount after spending; it does not shrink automatically. Recheck it each month.</p><form onSubmit={save}><label>Essentials remaining this month<input type="number" inputMode="decimal" min="0" step="0.01" required value={essentials} onChange={event=>setEssentials(event.target.value)}/></label><label>Protected checking buffer<input type="number" inputMode="decimal" min="0" step="0.01" required value={buffer} onChange={event=>setBuffer(event.target.value)}/></label><button className="secondary" type="submit">Save cash plan</button></form>{error&&<p role="alert" className="save-error">{error}</p>}</details>
    {position.planned&&<div className="cash-decision-result"><span>Possible room for extra payment this month</span><strong>{money.format(position.potentialExtra)}</strong><small>Estimate only. Confirm pending transactions and upcoming costs with your bank before paying extra.</small></div>}
  </section>
}
