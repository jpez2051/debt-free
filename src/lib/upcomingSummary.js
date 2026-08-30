import { localDate, trackedObligations, transactionDay } from './finance.js'

// A presentation-only selection. Never merge, delete, or reassign statements.
// Keep the full obligation list for cash calculations and statement history.
export function upcomingSummary(data, now=new Date()) {
  const today=localDate(now),obligations=trackedObligations(data,now)
  const cards=data.accounts.filter(a=>a.type==='credit').map(card=>{
    const items=obligations.filter(o=>o.cardId===card.id)
      .sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.statementId.localeCompare(b.statementId))
    const selected=items.find(o=>o.remaining>0&&o.dateKey<today)||items.find(o=>o.dateKey>=today)
    const additionalUnpaid=items.filter(o=>o.statementId!==selected?.statementId&&o.remaining>0)
    return {
      ...selected,id:`summary-card-${card.id}`,kind:'card',cardId:card.id,name:card.name,
      statementNeeded:!selected,overdue:Boolean(selected&&selected.remaining>0&&selected.dateKey<today),
      additionalUnpaidCount:additionalUnpaid.length,
      additionalOverdueCount:additionalUnpaid.filter(o=>o.dateKey<today).length,
      reviewCount:data.cardStatements.filter(s=>s.cardId===card.id&&!s.supersededBy&&s.needsReview).length,
      reviewPaymentCount:data.payments.filter(p=>p.cardId===card.id&&p.assignmentStatus==='unassigned'&&items.some(s=>s.dateKey>=transactionDay(p)&&s.dateKey>=today)).length,
    }
  })
  return [...obligations.filter(o=>o.kind==='bill'),...cards].sort((a,b)=>(a.dateKey||'9999-12-31').localeCompare(b.dateKey||'9999-12-31')||a.name.localeCompare(b.name))
}
