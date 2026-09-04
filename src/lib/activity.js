import { calendarDate, localDate, transactionDay } from './finance.js'
import { categoryLabel } from './categories.js'

export const defaultActivityFilters=()=>({accountId:'',period:'all',type:'',search:'',from:'',to:''})
export function activityEntries(data) {
  const name=id=>data.accounts.find(a=>a.id===id)?.name||'Unknown account'
  const wrap=(source,entry,type,accountIds,title,detail)=>({id:`${source}:${entry.id}`,source,entry,type,accountIds,date:transactionDay(entry),title,detail})
  return [
    ...data.transactions.map(t=>wrap('transaction',t,t.kind||'purchase',[t.accountId,t.toAccountId].filter(Boolean),t.merchant||t.description||'Activity',t.kind==='transfer'?`${name(t.accountId)} → ${t.toAccountId?name(t.toAccountId):t.merchant||'Outside account'} · ${t.transferPurpose||'Other transfer'}`:t.kind==='income'?`${name(t.accountId)} · Income`:`${name(t.accountId)} · ${categoryLabel(t)}`)),
    ...(data.payments||[]).map(p=>wrap('cardPayment',p,'payment',[p.bankId,p.cardId],'Card payment',`${name(p.bankId)} → ${name(p.cardId)}`)),
    ...(data.billPayments||[]).map(p=>wrap('billPayment',p,(p.fundingType||data.accounts.find(a=>a.id===p.bankId)?.type)==='credit'?'purchase':'payment',[p.bankId],p.billName||data.bills.find(b=>b.id===p.billId)?.name||'Recurring bill',`${name(p.bankId)} · ${categoryLabel(p)}`)),
    ...(data.adjustments||[]).map(a=>wrap('adjustment',a,'adjustment',[a.accountId],'Balance adjustment',`${name(a.accountId)} · ${a.reason}`)),
  ].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))
}
export function activityDateRange(filters, now=new Date()) {
  if(filters.period==='month')return {from:localDate(new Date(now.getFullYear(),now.getMonth(),1,12)),to:localDate(new Date(now.getFullYear(),now.getMonth()+1,0,12))}
  if(filters.period==='lastMonth')return {from:localDate(new Date(now.getFullYear(),now.getMonth()-1,1,12)),to:localDate(new Date(now.getFullYear(),now.getMonth(),0,12))}
  if(filters.period==='custom')return {from:filters.from,to:filters.to}
  return {from:'',to:''}
}
export function filterActivity(entries, filters, now=new Date()) {
  const {from,to}=activityDateRange(filters,now)
  const error=(from&&!calendarDate(from))||(to&&!calendarDate(to))?'Enter valid calendar dates.':from&&to&&from>to?'Start date must be on or before end date.':''
  if(error)return {entries:[],error}
  const query=filters.search.trim().toLocaleLowerCase()
  return {error:'',entries:entries.filter(row=>
    (!filters.accountId||row.accountIds.includes(filters.accountId))&&
    (!filters.type||row.type===filters.type)&&
    (!from||row.date>=from)&&(!to||row.date<=to)&&
    (!query||[row.title,row.detail,row.entry.description,row.entry.note,row.entry.notes].filter(Boolean).join(' ').toLocaleLowerCase().includes(query))
  )}
}
