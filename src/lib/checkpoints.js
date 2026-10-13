import { cents, localDate, transactionDay } from './finance.js'
export function invalidateCheckpoints(before,after){
  const changedMonths=new Set()
  for(const key of ['transactions','billPayments']){const previous=new Map((before[key]||[]).map(e=>[e.id,e])),next=new Map((after[key]||[]).map(e=>[e.id,e]));for(const id of new Set([...previous.keys(),...next.keys()])){const a=previous.get(id),b=next.get(id);if(JSON.stringify(a)!==JSON.stringify(b))for(const entry of [a,b].filter(Boolean))if(key==='billPayments'||['purchase','refund'].includes(entry.kind))changedMonths.add(transactionDay(entry).slice(0,7))}}
  return {...after,...(after.completedMonths?{completedMonths:after.completedMonths.filter(month=>!changedMonths.has(month))}:{}),accounts:after.accounts.map(account=>{
    const prior=before.accounts.find(a=>a.id===account.id);if(!prior?.reconciledAt||cents(prior.balance)===cents(account.balance)||prior.reconciledAt!==account.reconciledAt)return account
    const checked=localDate(new Date(prior.reconciledAt));let invalid=false
    for(const key of ['transactions','payments','billPayments']){
      const old=new Map((before[key]||[]).map(e=>[e.id,e])),current=new Map((after[key]||[]).map(e=>[e.id,e]))
      for(const id of new Set([...old.keys(),...current.keys()])){const previous=old.get(id),next=current.get(id);if(JSON.stringify(previous)===JSON.stringify(next))continue;for(const entry of [previous,next].filter(Boolean)){const affects=key==='transactions'?entry.accountId===account.id||entry.toAccountId===account.id:entry.bankId===account.id||entry.cardId===account.id;if(affects&&!entry.historical&&entry.status!=='pending'&&(previous?transactionDay(entry)<=checked:transactionDay(entry)<checked))invalid=true}}
    }
    return invalid?{...account,reconciliationNeedsReview:true}:account
  })}
}
