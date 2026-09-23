import { cents, dollars, statementCycleMismatch, statementTotals } from './finance.js'

export function paymentEffortRows(data,now=new Date()) {
  const accounts=new Map((data.accounts||[]).map(account=>[account.id,account]))
  return (data.cardStatements||[])
    .filter(statement=>!statement.needsReview&&!statement.supersededBy&&!statementCycleMismatch(statement,data.payments||[]))
    .map(statement=>{
      const totals=statementTotals(statement,data.payments||[],now)
      return {
        statementId:statement.id,
        cardId:statement.cardId,
        cardName:accounts.get(statement.cardId)?.name||'Credit card',
        dueDate:statement.dueDate,
        minimum:dollars(cents(statement.minimum)),
        paid:dollars(cents(totals.actualPaid)),
        aboveMinimum:dollars(Math.max(0,cents(totals.actualPaid)-cents(statement.minimum))),
      }
    })
    .filter(row=>row.paid>0)
    .sort((a,b)=>b.dueDate.localeCompare(a.dueDate)||a.cardName.localeCompare(b.cardName))
}

export function paymentEffortSummary(rows) {
  return {
    cycles:rows.length,
    paid:dollars(rows.reduce((total,row)=>total+cents(row.paid),0)),
    aboveMinimum:dollars(rows.reduce((total,row)=>total+cents(row.aboveMinimum),0)),
  }
}
