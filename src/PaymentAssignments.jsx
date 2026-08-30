import { useState } from 'react'
import './v092.css'
import { assignCardPayments, transactionDay, cents, dollars } from './lib/finance.js'

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})
export default function PaymentAssignments({data,update}) {
  const cards=data.accounts.filter(a=>a.type==='credit')
  const [cardId,setCardId]=useState(cards[0]?.id||'')
  const [onlyUnassigned,setOnlyUnassigned]=useState(true)
  const [selected,setSelected]=useState([]),[target,setTarget]=useState('')
  const [error,setError]=useState(''),[notice,setNotice]=useState('')
  const payments=data.payments.filter(p=>p.cardId===cardId&&(!onlyUnassigned||p.assignmentStatus==='unassigned')).sort((a,b)=>transactionDay(b).localeCompare(transactionDay(a)))
  const chosen=payments.filter(p=>selected.includes(p.id))
  const statements=data.cardStatements.filter(s=>s.cardId===cardId).sort((a,b)=>b.dueDate.localeCompare(a.dueDate))
  const amount=money.format(dollars(chosen.reduce((n,p)=>n+cents(p.amount),0)))
  const submit=e=>{e.preventDefault();setError('');setNotice('');try{
    const next=assignCardPayments(data,chosen.map(p=>p.id),target)
    if(update(next)===false)throw new Error('Nothing was saved. Check the browser save warning and try again.')
    setSelected([]);setNotice(`${chosen.length} payment(s) updated. Amounts and balances were not changed.`)
  }catch(e){setError(e.message)}}
  return <details className="payment-assignments"><summary>Review payment assignments ({data.payments.filter(p=>p.assignmentStatus==='unassigned').length} needing review)</summary>
    <p>Payments marked Already included are historical/general by default: they remain in Activity and never change current balances again. They do not create dashboard warnings or count toward a minimum unless you explicitly assign them to a statement.</p>
    <p>Select payments for the same statement—even if you paid early or more than once. Or mark payments as historical/general when no statement assignment is needed.</p>
    <form onSubmit={submit}>
      <label>Card<select value={cardId} onChange={e=>{setCardId(e.target.value);setSelected([]);setTarget('');setNotice('');setError('')}}>{cards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="assignment-check"><input type="checkbox" checked={onlyUnassigned} onChange={e=>{setOnlyUnassigned(e.target.checked);setSelected([])}}/> Show only payments needing review</label>
      {payments.length>0&&<button type="button" className="secondary" onClick={()=>setSelected(selected.length===payments.length?[]:payments.map(p=>p.id))}>{selected.length===payments.length?'Clear selection':'Select all shown'}</button>}
      {!payments.length&&<p>No payments match this view.</p>}
      {payments.map(p=>{const statement=statements.find(s=>s.id===p.statementId),previous=statements.find(s=>s.id===p.previousStatementId);return <label className="assignment-check reliable-row" key={p.id}>
        <input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id))}/>
        <span>{transactionDay(p)} · {money.format(p.amount)} · From {data.accounts.find(a=>a.id===p.bankId)?.name||p.bankName}<small>{p.assignmentStatus==='confirmed'&&statement?`Assigned: due ${statement.dueDate}`:p.assignmentStatus==='general'?'Historical/general · no statement needed':'Needs review'}{p.assignmentStatus==='unassigned'&&previous?` · Previous unverified assignment: due ${previous.dueDate}`:''}</small></span>
      </label>})}
      <label>Classify selected payments<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Needs review — decide later</option><option value="__general__">Historical/general — no statement needed</option>{statements.map(s=><option key={s.id} value={s.id}>Statement due {s.dueDate} · {money.format(s.minimum)} minimum{s.supersededBy?' · Carried forward':''}</option>)}</select></label>
      <p>{chosen.length} selected · {amount}. {target==='__general__'?'These will remain in history without counting toward a statement or changing balances.':target?`These payments will count toward the statement due ${statements.find(s=>s.id===target)?.dueDate}.`:'These payments will remain flagged for review.'} No amounts, payment dates, or balances will change.</p>
      <button className="primary" type="submit" disabled={!chosen.length}>{target==='__general__'?'Mark historical/general':target?'Confirm assignment':'Keep for review'}</button>
      {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    </form>
  </details>
}
