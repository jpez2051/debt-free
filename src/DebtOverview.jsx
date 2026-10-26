import {debtProgressSummary} from './lib/debtProgress.js'
import {accountBalances} from './lib/accountBalances.js'
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2})
const reasonLabels={
 'accounts-changed':'Cards were added, removed, or reclassified. This changes the tracked total without necessarily being new spending or repayment.',
 'balance-correction':'This comparison includes balance corrections. A correction is not necessarily a payment.',
 'activity-correction':'This comparison includes edited, removed, or backdated card activity. It is not solely new spending and payments.',
}
export default function DebtOverview({data,onStart,onCards}){
 const summary=debtProgressSummary(data),pending=data.accounts.filter(a=>a.type==='credit').reduce((sum,a)=>sum+accountBalances(data,a.id).pendingDebt,0)
 const date=summary.date?new Date(`${summary.date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):''
 const change=summary.delta===null?'':summary.delta>0?`↑ +${money.format(summary.delta)} increase`:summary.delta<0?`↓ −${money.format(Math.abs(summary.delta))} decrease`:'— No change'
 return <section className="panel content-panel debt-overview" aria-labelledby="debt-overview-title"><div className="debt-overview-head"><div><span className="kicker">YOUR DEBT PICTURE</span><h2 id="debt-overview-title">Card debt</h2><strong className="debt-overview-total">{summary.count?money.format(summary.debt):'—'}</strong></div><button type="button" className="secondary" onClick={onCards}>{summary.count?'View cards':'Add an account'}</button></div>
 {summary.delta!==null?<><p className={`debt-change ${summary.tone}`} role="status">{change} since {date}</p><p className="muted">Recorded balance change—not simply payments made.</p><details><summary>{summary.reasons.length?'Why this comparison is neutral':'About this comparison'}</summary><p>Starting recorded card debt: {money.format(data.debtProgress.startingDebt)} on {date}. No earlier balance was inferred from transaction history.</p>{summary.reasons.map(reason=><p key={reason}>{reasonLabels[reason]}</p>)}{summary.reasons.length>0&&<p>The change includes recording/setup changes, so it is not colored as spending or payoff progress.</p>}<button type="button" className="secondary" onClick={onStart}>Start a new comparison from today</button></details></>:summary.count?<div><p>No saved starting snapshot yet. Start tracking from today’s recorded balances; your next saved update also starts tracking.</p><button type="button" className="secondary" onClick={onStart}>Start tracking debt changes</button></div>:<p>Add your real card balances to start tracking debt.</p>}
 <p className="debt-overview-note">{summary.count} recorded card{summary.count===1?'':'s'} · Posted balances only. Loans and mortgages are not included.</p>{summary.credits>0&&<p className="muted">{money.format(summary.credits)} in card credits is separate; it does not repay another card.</p>}{pending>0&&<p className="muted">{money.format(pending)} in pending card charges is not included until posted.</p>}
 </section>
}
