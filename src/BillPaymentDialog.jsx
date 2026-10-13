import DraftRecovery from './DraftRecovery.jsx'
import { forgetSavedDraft } from './lib/savedDrafts.js'
import { useState } from 'react'
import { AccessibleDialog } from './ReliabilityCenter.jsx'
import { billBalanceChanges, billMonthDate, editBillPaymentDraft, possibleBillMatches, saveBillCharge } from './lib/billRecording.js'
import { cycleTotals, localDate, transactionDay } from './lib/finance.js'
import './bills.css'

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})
const dateLabel=value=>value?new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Choose a date'
const monthLabel=value=>value?new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{month:'long',year:'numeric'}):'Choose a month'

export default function BillPaymentDialog({data,initial,onSave,onClose,onRemove,now=new Date()}){
  const [form,setForm]=useState(initial),[error,setError]=useState(''),[separate,setSeparate]=useState(false),[useExisting,setUseExisting]=useState(Boolean(initial.transactionId))
  const bill=data.bills.find(b=>b.id===form.billId),account=data.accounts.find(a=>a.id===form.bankId),source=data.transactions.find(t=>t.id===form.transactionId),credit=account?.type==='credit'
  const field=(key,value)=>{setForm(f=>({...f,[key]:value,...(key==='dueDate'?{confirmFuture:false}:{})}));setSeparate(false);setError('')}
  const selectEntry=id=>{
    const t=data.transactions.find(t=>t.id===id)
    setForm(f=>t?{...f,transactionId:id,date:transactionDay(t),amount:t.amount,bankId:t.accountId,historical:Boolean(t.historical),status:t.status||'cleared'}:{...f,transactionId:''})
    setSeparate(false);setError('')
  }
  const matches=possibleBillMatches(data,form).filter(p=>p.id!==source?.id)
  let preview=null,previewError=''
  try{preview=saveBillCharge(data,form,now)}catch(e){previewError=e.message}
  const changes=preview?billBalanceChanges(data,preview):[]
  const earlier=data.billCycles.filter(c=>c.billId===form.billId&&c.dueDate<form.dueDate&&cycleTotals(c,data.billPayments,now).remaining>0)
  const submit=e=>{
    e.preventDefault();setError('')
    if(useExisting&&!source){setError('Choose the entry you already recorded in Activity.');return}
    if(matches.length&&!separate){setError('Review the possible matching entries below before saving.');return}
    try{const next=saveBillCharge(data,form,now);if(onSave(next)!==false){forgetSavedDraft(onSave,'bill-payment');onClose();}else setError('The correction could not be saved. Check the save warning and try again.')}catch(e){setError(e.message)}
  }
  const entries=data.transactions.filter(t=>['purchase','transfer'].includes(t.kind)&&t.accountId===form.bankId).slice().sort((a,b)=>transactionDay(b).localeCompare(transactionDay(a)))
  return <AccessibleDialog title={form.id?(credit?'Edit bill charge':'Edit bill payment'):(credit?'Record bill charge':'Record bill payment')} onClose={onClose}><form className="bill-record-form" onSubmit={submit}><DraftRecovery kind="bill-payment" draft={form} onRestore={setForm}/>
    <label>Bill<select required value={form.billId||''} onChange={e=>{const b=data.bills.find(b=>b.id===e.target.value);if(!b){setForm(f=>({...f,billId:'',dueDate:''}));return}setForm(f=>({...f,billId:b.id,dueDate:billMonthDate(data,b,(f.date||localDate(now)).slice(0,7)),actualAmount:b.amount,confirmActual:false,confirmFuture:false,bankId:f.transactionId?f.bankId:b.accountId||'',amount:f.transactionId?f.amount:b.amount}));setSeparate(false)}}><option value="">Choose bill</option>{data.bills.filter(b=>b.active!==false||b.id===form.billId).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
    {bill&&<label>{bill.frequency==='annual'?'Bill due date':'Bill month'}<input required type={bill.frequency==='annual'?'date':'month'} value={bill.frequency==='annual'?form.dueDate:form.dueDate?.slice(0,7)||''} onInput={e=>field('dueDate',bill.frequency==='annual'?e.target.value:billMonthDate(data,bill,e.target.value))} onChange={e=>field('dueDate',bill.frequency==='annual'?e.target.value:billMonthDate(data,bill,e.target.value))}/></label>}
    <p className="bill-month-confirmation">This records {bill?.frequency==='annual'?`the bill due ${dateLabel(form.dueDate)}`:`the ${monthLabel(form.dueDate)} bill`} · Due {dateLabel(form.dueDate)}.</p>
    <label>Paid from / charged to<select required value={form.bankId||''} disabled={Boolean(source)} onChange={e=>field('bankId',e.target.value)}><option value="">Choose account</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <div className="bill-entry-choice" role="group" aria-label="Where the charge is recorded"><button type="button" className={!useExisting?'primary':'secondary'} onClick={()=>{setUseExisting(false);selectEntry('')}}>{form.id?'Edit recorded entry':credit?'New charge':'New payment'}</button><button type="button" className={useExisting?'primary':'secondary'} onClick={()=>setUseExisting(true)}>Use entry already in Activity</button></div>
    {useExisting&&<label>Existing expense or transfer<select required value={form.transactionId||''} onChange={e=>selectEntry(e.target.value)}><option value="">Choose the entry to correct</option>{entries.map(t=><option key={t.id} value={t.id}>{dateLabel(transactionDay(t))} · {t.merchant} · {money.format(t.amount)} · {t.kind==='transfer'?'Transfer':'Expense'}</option>)}</select></label>}
    <div className="bill-form-pair"><label>{credit?'Charged on':'Paid on'}<input required type="date" max={localDate(now)} value={form.date||''} disabled={Boolean(source)} onClick={e=>{try{e.currentTarget.showPicker?.()}catch{}}} onChange={e=>field('date',e.target.value)}/></label><label>Amount<input required type="number" inputMode="decimal" min=".01" step=".01" disabled={Boolean(source)} value={form.amount??''} onChange={e=>field('amount',e.target.value)}/></label></div>
    {!source&&!form.historical&&<label>Bank status<select value={form.status||'cleared'} onChange={e=>field('status',e.target.value)}><option value="cleared">Cleared / posted</option><option value="pending">Pending — not cleared yet</option></select></label>}
    {source?<p>The selected {source.kind==='transfer'?'transfer':'expense'} will become this bill entry. Its posted date and amount are kept.</p>:<label className="check-line"><input type="checkbox" checked={Boolean(form.historical)} onChange={e=>field('historical',e.target.checked)}/> Already included in my current account balance</label>}
    {bill&&<details className="bill-invoice-details"><summary>Actual bill total differs from the estimate</summary><p>For a price change, enter the full invoice total. For a partial payment, leave the invoice total unchanged.</p><label className="check-line"><input type="checkbox" checked={Boolean(form.confirmActual)} onChange={e=>field('confirmActual',e.target.checked)}/> Update this bill month’s invoice total</label>{form.confirmActual&&<label>Full invoice total<input required type="number" inputMode="decimal" min="0" step=".01" value={form.actualAmount??''} onChange={e=>field('actualAmount',e.target.value)}/></label>}</details>}
    {form.date&&form.dueDate&&form.date.slice(0,7)!==form.dueDate.slice(0,7)&&<p className="warning-text">The posted date is in {monthLabel(form.date)}, but this payment belongs to {monthLabel(form.dueDate)}. Check that this is an early or late payment.</p>}
    {form.dueDate?.slice(0,7)>localDate(now).slice(0,7)&&<label className="check-line"><input type="checkbox" checked={Boolean(form.confirmFuture)} onChange={e=>field('confirmFuture',e.target.checked)}/> I intend to record this future bill month{earlier.length?`; ${earlier.length} earlier month(s) remain unpaid`:''}.</label>}
    {matches.length>0&&<div className="bill-match-review"><strong>Could this already be recorded?</strong><p>These entries have the same account and amount within seven days. Check them before adding another charge.</p>{matches.map(p=><div className="bill-match" key={`${p.source}-${p.id}`}><span>{p.merchant||p.billName} · {dateLabel(transactionDay(p))} · {money.format(p.amount)}{p.source==='billPayment'?` · Bill due ${dateLabel(data.billCycles.find(c=>c.id===p.cycleId)?.dueDate)}`:` · ${p.kind==='transfer'?'Transfer':'Expense'}`}</span><button type="button" className="secondary" onClick={()=>{if(p.source==='transaction'){setUseExisting(true);selectEntry(p.id)}else{setForm({...editBillPaymentDraft(data,p),...(source?{transactionId:source.id,dueDate:p.billId===form.billId?form.dueDate:data.billCycles.find(c=>c.id===p.cycleId)?.dueDate||form.dueDate,date:transactionDay(source),amount:source.amount,bankId:source.accountId,historical:Boolean(source.historical)}:{})});setUseExisting(Boolean(source));setSeparate(false);setError('')}}}>{p.source==='transaction'?'Use this entry':'Correct this bill entry'}</button></div>)}<label className="check-line"><input required type="checkbox" checked={separate} onChange={e=>setSeparate(e.target.checked)}/> I checked; the other entries are separate charges.</label></div>}
    <div className="bill-save-preview" role="status"><strong>After saving</strong>{preview?<><p>{money.format(Number(source?.amount??form.amount))} for {monthLabel(form.dueDate)} · {credit?'Charged to':'Paid from'} {account?.name}.</p>{changes.length?changes.map(a=><p key={a.id}>{a.name}: {money.format(a.before)} → {money.format(a.after)}{a.after<0&&a.type!=='credit'?' · Below zero':''}</p>):<p>Your account balances stay the same.</p>}{source?.toAccountId&&<p>The transfer to {data.accounts.find(a=>a.id===source.toAccountId)?.name} is reversed because this was a bill charge.</p>}</>:<p>{previewError}</p>}</div>
    {error&&<p className="warning-text" role="alert">{error}</p>}
    <button type="submit" className="primary">{form.id?'Save correction':credit?'Save bill charge':'Save bill payment'}</button>
    {form.id&&<button type="button" className="secondary bill-undo" onClick={()=>{const p=data.billPayments.find(p=>p.id===form.id);if(p&&onRemove(p)!==false)onClose()}}>Undo this recorded charge</button>}
  </form></AccessibleDialog>
}
