export function openingBalanceConflicts(data,form){
 if(form.historical||!form.date)return []
 const ids=new Set([form.accountId,form.bankId,form.cardId,form.toAccountId].filter(Boolean))
 return data.accounts.filter(a=>ids.has(a.id)&&a.openingDate&&form.date<a.openingDate)
}
export function openingBalanceKey(data,form){return JSON.stringify([form.date,openingBalanceConflicts(data,form).map(a=>[a.id,a.openingDate])])}
export function assertOpeningBalanceChoice(data,form){
 if(openingBalanceConflicts(data,form).length&&form.openingBalanceConfirmation!==openingBalanceKey(data,form))throw Error('This entry predates an account’s opening balance. Mark it already included, or explicitly confirm it was not included before changing the balance.')
}
