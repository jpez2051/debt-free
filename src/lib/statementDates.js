// Closing dates belong to individual issuer statements, not an account-wide
// recurring day. A due date alone cannot establish the closing date.
export function closingDateForDue(data,card,dueDate=card?.nextDueDate){
 const statements=(data.cardStatements||[]).filter(s=>s.cardId===card?.id)
 if(!statements.length)return card?.statementDate||''
 return statements.find(s=>s.dueDate===dueDate)?.closingDate||''
}
