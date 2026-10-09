import { saveLedgerTransaction, recordCardPayment, cents, dollars } from './finance.js'

export function entryPreview(data,form,kind){
  if(!form.amount||Number(form.amount)<=0)return null
  try{
    const next=kind==='payment'?recordCardPayment(data,form):saveLedgerTransaction(data,{...form,id:form.id||'entry-preview'},kind)
    const changes=next.accounts.flatMap(a=>{const before=data.accounts.find(b=>b.id===a.id);const delta=cents(a.balance)-cents(before.balance);return delta?[{id:a.id,name:a.name,type:a.type,before:before.balance,after:a.balance,delta:dollars(delta)}]:[]})
    return {changes,historical:Boolean(form.historical)}
  }catch{return null}
}
