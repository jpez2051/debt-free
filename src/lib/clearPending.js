import { localDate, recordBillPayment, recordCardPayment, removeCardPayment, removeRecurringPayment, saveLedgerTransaction, transactionDay } from './finance.js'
export function clearPending(source,kind,id,now=new Date()){
  const collection=kind==='transaction'?'transactions':kind==='bill'?'billPayments':'payments',entry=source[collection].find(e=>e.id===id&&e.status==='pending')
  if(!entry)throw Error('Choose a pending entry that still exists.')
  if(kind==='transaction')return saveLedgerTransaction(source,{...entry,date:localDate(now),status:'cleared',initiatedDate:transactionDay(entry)},entry.kind,now)
  const data=kind==='bill'?removeRecurringPayment(source,id,now):removeCardPayment(source,id,now),form={...entry,date:localDate(now),status:'cleared',confirmActual:false,paymentIntent:entry.assignmentStatus==='extra'?'extra':entry.assignmentStatus==='general'?'general':'review'},next=kind==='bill'?recordBillPayment(data,form,now):recordCardPayment(data,form,now)
  next[collection][0].id=id;next[collection][0].initiatedDate=transactionDay(entry)
  return next
}
