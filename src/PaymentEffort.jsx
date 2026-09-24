import { useState } from 'react'
import { paymentEffortRows, paymentEffortSummary } from './lib/paymentEffort.js'

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})
const dateLabel=value=>new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})

export default function PaymentEffort({data,now=new Date()}) {
  const [selectedCard,setSelectedCard]=useState('all')
  const cards=(data.accounts||[]).filter(account=>account.type==='credit')
  const rows=paymentEffortRows(data,now).filter(row=>selectedCard==='all'||row.cardId===selectedCard)
  const summary=paymentEffortSummary(rows)
  const unmatched=(data.payments||[]).filter(payment=>selectedCard==='all'||payment.cardId===selectedCard)
  const pending=unmatched.filter(payment=>payment.assignmentStatus==='unassigned').length
  const general=unmatched.filter(payment=>payment.assignmentStatus==='extra').length
  const row=item=><div className="payment-effort-row" key={item.statementId}><div><strong>{item.cardName}</strong><small>Statement due {dateLabel(item.dueDate)}</small></div><div><span>{money.format(item.paid)} paid</span><small>{money.format(item.minimum)} minimum</small></div><div className="payment-effort-above"><strong>{money.format(item.aboveMinimum)}</strong><small>above minimum</small></div></div>
  return <section className="panel content-panel payment-effort" aria-labelledby="payment-effort-title">
    <div className="payment-effort-head"><div><span className="kicker">ACTUAL PAYOFF EFFORT</span><h2 id="payment-effort-title">Payments above minimum</h2><p className="muted">Calculated from payments assigned to confirmed card statements—not from the Payoff Plan’s future extra amount.</p></div><label>Card<select aria-label="Filter payment effort by card" value={selectedCard} onChange={event=>setSelectedCard(event.target.value)}><option value="all">All cards</option>{cards.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}</select></label></div>
    {rows.length?<><div className="payment-effort-summary"><div><span>Paid toward statements</span><strong>{money.format(summary.paid)}</strong></div><div><span>Above confirmed minimums</span><strong>{money.format(summary.aboveMinimum)}</strong></div></div><p className="payment-effort-note">Across {summary.cycles} recorded statement cycle{summary.cycles===1?'':'s'} in this view. Historical payments count toward history but do not reduce today’s balances again.</p><div className="payment-effort-list">{rows.slice(0,5).map(row)}</div>{rows.length>5&&<details className="payment-effort-more"><summary>Show {rows.length-5} earlier cycle{rows.length-5===1?'':'s'}</summary><div className="payment-effort-list">{rows.slice(5).map(row)}</div></details>}</>:<p className="payment-effort-empty">No payments are assigned to a confirmed statement{selectedCard==='all'?'':' for this card'} yet. Recorded payments remain in Payment history below.</p>}
    {(pending>0||general>0)&&<div className="payment-effort-review"><p className="payment-effort-note">{pending>0?`${pending} payment${pending===1?'':'s'} still need statement review. `:''}{general>0?`${general} general card payment${general===1?' is':'s are'} not tied to a statement. `:''}These are excluded from the above-minimum total; assign one to a statement only if you want it counted toward that cycle.</p><button type="button" className="secondary compact" onClick={()=>{const target=document.querySelector('.payment-assignments');if(target){target.open=true;target.scrollIntoView({behavior:'smooth',block:'start'})}}}>Review assignments</button></div>}
    <p className="payment-effort-note">This measures payments above the stated minimum, not interest saved or a promise to repeat the amount next month.</p>
  </section>
}
