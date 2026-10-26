import { billScheduleAt } from './billSchedule.js'
import { billDisplayCycle, calendarDate, cents, cycleTotals, dollars, dueInMonth, localDate, prepareData, recordBillPayment, removeLedgerTransaction, removeRecurringPayment, transactionDay } from './finance.js'

export function billMonthDate(data,bill,month){
  if(!calendarDate(`${month}-01`))return ''
  const existing=data.billCycles.filter(c=>c.billId===bill.id&&c.dueDate.startsWith(month)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]
  return existing?.dueDate||dueInMonth(Number(month.slice(0,4)),Number(month.slice(5,7))-1,billScheduleAt(bill,data.billCycles,`${month}-28`)?.dueDay||bill.dueDay||Number(bill.nextDueDate?.slice(8))||1)
}

export function createBillPaymentDraft(data,bill,selected,now=new Date()){
  const selectedId=typeof selected==='string'?selected:selected?.cycleId||selected?.id
  const cycle=data.billCycles.find(c=>c.id===selectedId&&c.billId===bill.id)||(typeof selected==='object'&&calendarDate(selected?.dueDate)?{id:'',dueDate:selected.dueDate,expectedAmount:billScheduleAt(bill,data.billCycles,selected.dueDate)?.amount??bill.amount,actualAmount:null}:billDisplayCycle(data,bill,now))
  return {billId:bill.id,cycleId:cycle?.id||'',dueDate:cycle?.dueDate||bill.nextDueDate||localDate(now),date:localDate(now),amount:cycle?cycleTotals(cycle,data.billPayments,now).remaining:bill.amount,bankId:bill.accountId||data.accounts[0]?.id||'',historical:false,confirmActual:false,actualAmount:cycle?.actualAmount??cycle?.expectedAmount??bill.amount,transactionId:''}
}

export function editBillPaymentDraft(data,payment){
  const cycle=data.billCycles.find(c=>c.id===payment.cycleId)
  return {id:payment.id,billId:payment.billId,cycleId:payment.cycleId,dueDate:cycle?.dueDate||'',date:transactionDay(payment),amount:payment.amount,bankId:payment.bankId,status:payment.status||'cleared',historical:Boolean(payment.historical),confirmActual:false,actualAmount:cycle?.actualAmount??cycle?.expectedAmount??payment.amount,description:payment.description||'',transactionId:''}
}

// Corrections and conversions run on a copy and are persisted once. Reverse the
// original balance effects before applying the corrected, single bill entry.
export function saveBillCharge(source,form,now=new Date()){
  let data=prepareData(source,now)
  const previous=form.id?data.billPayments.find(p=>p.id===form.id):null
  if(form.id&&!previous)throw new Error('This charge no longer exists. Close this window and review the latest history.')
  const entry=form.transactionId?data.transactions.find(t=>t.id===form.transactionId):null
  if(form.transactionId&&(!entry||!['purchase','transfer'].includes(entry.kind)))throw new Error('Choose an expense or transfer that is still in Activity.')
  if(!data.bills.some(b=>b.id===form.billId)||!calendarDate(form.dueDate))throw new Error('Choose a bill and the month or due date it belongs to.')
  if((!previous||data.billCycles.find(c=>c.id===previous.cycleId)?.dueDate!==form.dueDate)&&form.dueDate.slice(0,7)>localDate(now).slice(0,7)&&form.confirmFuture!==true)throw new Error('Confirm that you intend to record this future bill month. Your payment date alone does not choose its month.')
  if(previous)data=removeRecurringPayment(data,previous.id,now)
  if(entry)data=removeLedgerTransaction(data,entry.id,now)
  const values=entry?{...form,date:transactionDay(entry),amount:entry.amount,description:entry.description||'',bankId:entry.accountId,historical:Boolean(entry.historical),status:entry.status||'cleared'}:form
  const next=recordBillPayment(data,values,now)
  next.billPayments[0].id=previous?.id||entry?.id||next.billPayments[0].id
  return next
}

export function possibleBillMatches(data,form){
  const day=Date.parse(form.date),near=date=>Number.isFinite(day)&&Math.abs(Date.parse(date)-day)<=7*86400000
  return [
    ...data.transactions.filter(t=>['purchase','transfer'].includes(t.kind)).map(t=>({...t,source:'transaction',bankId:t.accountId})),
    ...data.billPayments.filter(p=>p.id!==form.id).map(p=>({...p,source:'billPayment'})),
  ].filter(p=>p.bankId===form.bankId&&cents(p.amount)===cents(form.amount)&&near(transactionDay(p))).sort((a,b)=>transactionDay(b).localeCompare(transactionDay(a)))
}

export function billBalanceChanges(before,after){
  return after.accounts.map(a=>{const prior=before.accounts.find(b=>b.id===a.id);return {id:a.id,name:a.name,type:a.type,before:prior?.balance??0,after:a.balance,delta:dollars(cents(a.balance)-cents(prior?.balance))}}).filter(a=>cents(a.delta)!==0)
}
