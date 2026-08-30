import { upcomingSummary } from './lib/upcomingSummary.js'

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})
export default function UpcomingSummary({data,onStatements,now=new Date()}) {
  const items=upcomingSummary(data,now)
  return <section className="panel content-panel upcoming-summary"><span className="kicker">NEXT UP</span><h2>Upcoming obligations</h2><p className="muted">One row per card. Overdue minimums come first; other statements stay in Debts.</p>
    {items.length?items.map(item=>{
      const card=item.kind==='card'
      const status=card?(item.statementNeeded?'New statement needed':item.needsReview?'Review statement':item.remaining?`${money.format(item.remaining)} due`:'Minimum met ✓'):(item.remaining?`${money.format(item.remaining)} due`:item.fundingType==='credit'?'Charged':'Paid')
      return <div className="summary-obligation" key={item.id}>
        <div className="summary-obligation-heading"><strong>{item.name}</strong><b>{status}</b></div>
        {item.statementNeeded?<small>Add the next statement when your issuer provides it. No new minimum has been assumed.</small>:<small>{money.format(item.required)} {card?'minimum':'bill'} · {money.format(item.actualPaid??item.paid)} {card?'paid':item.fundingType==='credit'?'charged':'paid'} · {item.overdue?'Overdue since':'Due'} {item.dueDate.toLocaleDateString()}{!card?` · ${item.accountName}`:''}</small>}
        {card&&item.additionalUnpaidCount>0&&<p className="summary-warning">{item.additionalUnpaidCount} other unpaid statement{item.additionalUnpaidCount===1?'':'s'}{item.additionalOverdueCount?` (${item.additionalOverdueCount} overdue)`:''}. Review whether the latest minimum includes past-due amounts; amounts are not combined in this row.</p>}
        {card&&item.reviewCount>0&&<p className="summary-warning">{item.reviewCount} imported statement{item.reviewCount===1?' needs':'s need'} review against your issuer’s records.</p>}
        {card&&item.reviewPaymentCount>0&&<p className="summary-warning">{item.reviewPaymentCount} recent payment{item.reviewPaymentCount===1?' may':'s may'} affect this minimum. Review payment assignments.</p>}
        {card&&<button type="button" className="mini" onClick={onStatements}>View statements</button>}
      </div>
    }):<div className="empty">Add recurring bills or card statements to see upcoming obligations.</div>}
  </section>
}
