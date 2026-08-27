import { calendarDate } from './finance.js'

export function validateData(data) {
  if(!data||typeof data!=='object'||!['accounts','transactions','payments','bills'].every(k=>Array.isArray(data[k])))return false
  if(data.financeVersion!==undefined&&data.financeVersion!==1)return false
  const keys=['accounts','transactions','payments','bills','billPayments','creditScores','cardStatements','billCycles','adjustments']
  for(const key of keys){
    if(data[key]!==undefined&&!Array.isArray(data[key]))return false
    const ids=new Set()
    for(const item of data[key]||[]){if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))return false;ids.add(item.id)}
  }
  const number=x=>typeof x!=='boolean'&&x!==null&&x!==''&&Number.isFinite(Number(x))
  const amount=x=>number(x)&&Number(x)>=0
  const date=x=>typeof x==='string'&&!Number.isNaN(new Date(x).getTime())
  const account=id=>data.accounts.find(a=>a.id===id),bill=id=>data.bills.find(b=>b.id===id)
  if(data.accounts.some(a=>!a.name||!number(a.balance)||(a.type!==undefined&&!['checking','savings','credit'].includes(a.type))||['minimum','apr','limit'].some(k=>a[k]!==undefined&&!amount(a[k]))))return false
  if(data.transactions.some(t=>!account(t.accountId)||!amount(t.amount)||!date(t.date)||(t.kind!==undefined&&!['income','purchase','transfer','refund'].includes(t.kind))))return false
  if(data.payments.some(p=>!account(p.bankId)||!account(p.cardId)||!amount(p.amount)||!date(p.date)||(account(p.bankId)?.type==='credit')||(account(p.cardId)?.type&&account(p.cardId).type!=='credit')))return false
  if(data.bills.some(b=>!b.name||!amount(b.amount)||(b.accountId&&!account(b.accountId))||(b.frequency&&!['monthly','annual'].includes(b.frequency))))return false
  if((data.billPayments||[]).some(p=>!account(p.bankId)||!bill(p.billId)||!amount(p.amount)||!date(p.date)))return false
  if((data.creditScores||[]).some(s=>!amount(s.score)||Number(s.score)<250||Number(s.score)>900||!date(s.date)))return false
  if((data.cardStatements||[]).some(s=>!account(s.cardId)||account(s.cardId).type!=='credit'||!calendarDate(s.dueDate)||!amount(s.minimum)))return false
  if((data.cardStatements||[]).some(s=>s.supersededBy&&!(data.cardStatements||[]).some(t=>t.id===s.supersededBy&&t.cardId===s.cardId&&t.dueDate>s.dueDate)))return false
  if((data.billCycles||[]).some(c=>!bill(c.billId)||!calendarDate(c.dueDate)||!amount(c.expectedAmount)||(c.actualAmount!=null&&!amount(c.actualAmount))))return false
  if(data.payments.some(p=>p.statementId&&!(data.cardStatements||[]).some(s=>s.id===p.statementId&&s.cardId===p.cardId)))return false
  if((data.billPayments||[]).some(p=>p.cycleId&&!(data.billCycles||[]).some(c=>c.id===p.cycleId&&c.billId===p.billId)))return false
  if((data.adjustments||[]).some(a=>!account(a.accountId)||!number(a.before)||!number(a.after)||!number(a.delta)||!date(a.date)||!a.reason))return false
  if(data.extra!==undefined&&!amount(data.extra))return false
  return true
}
