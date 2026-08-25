export function validateData(data){
  if(!data||typeof data!=='object'||!['accounts','transactions','payments','bills'].every(key=>Array.isArray(data[key])))return false
  const records=[...data.accounts,...data.transactions,...data.payments,...data.bills,...(data.billPayments||[]),...(data.creditScores||[])]
  if(records.some(x=>!x||typeof x!=='object'||x.id==null))return false
  const accountIds=new Set(data.accounts.map(x=>x.id)),billIds=new Set(data.bills.map(x=>x.id)),validNumber=x=>Number.isFinite(Number(x)),validAmount=x=>validNumber(x)&&Number(x)>=0,validDate=x=>!Number.isNaN(new Date(x).getTime())
  if(data.accounts.some(a=>!a.name||!validNumber(a.balance)))return false
  if(data.transactions.some(t=>!accountIds.has(t.accountId)||!validAmount(t.amount)||!validDate(t.date)))return false
  if(data.payments.some(p=>!accountIds.has(p.bankId)||!accountIds.has(p.cardId)||!validAmount(p.amount)||!validDate(p.date)))return false
  if(data.bills.some(b=>!b.name||!validAmount(b.amount)||(b.accountId&&!accountIds.has(b.accountId))))return false
  if((data.billPayments||[]).some(p=>!accountIds.has(p.bankId)||!billIds.has(p.billId)||!validAmount(p.amount)||!validDate(p.date)))return false
  return !(data.creditScores||[]).some(s=>!validAmount(s.score)||!validDate(s.date))
}
