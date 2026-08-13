function replaceOrThrow(code, before, after, label) {
  if (!code.includes(before)) throw new Error(`v0.5.4 transform failed: ${label}`)
  return code.replace(before, after)
}

export function transformAppV054(source) {
  let code = source

  code = `import './currencyPrecision.js'\nimport './v054.css'\n${code}`
  code = replaceOrThrow(code, "const VERSION='0.5.0'", "const VERSION='0.5.4'", 'version')

  code = replaceOrThrow(
    code,
    "const dateValue=()=>new Date().toISOString().slice(0,10)",
    `const dateValue=()=>new Date().toISOString().slice(0,10)\nconst dateLabel=value=>value?new Date(\`${'${value}'}T12:00:00\`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not set'\nconst addMonth=value=>{if(!value)return '';const d=new Date(\`${'${value}'}T12:00:00\`),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+1);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return d.toISOString().slice(0,10)}\nconst legacyCardDate=day=>{if(!day)return '';const now=new Date(),d=new Date(now.getFullYear(),now.getMonth(),Math.min(Number(day),28),12);if(d<new Date(now.getFullYear(),now.getMonth(),now.getDate(),0))d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,10)}\nconst cardDueDate=a=>a?.nextDueDate||legacyCardDate(a?.dueDay)\nconst cardStatementDate=a=>a?.statementDate||legacyCardDate(a?.statementDay)\nconst cycleStatus=a=>{const paid=Number(a?.cyclePaidAmount||0),minimum=Number(a?.minimum||0);if(paid>0&&minimum>0)return {label:'Partially paid',remaining:Math.max(0,minimum-paid)};if(a?.lastPaidDueDate)return {label:'Paid last cycle',remaining:minimum};return {label:'Due',remaining:minimum}}`,
    'date helpers'
  )

  code = replaceOrThrow(
    code,
    " const openAccountAdd=()=>{setForm({type:'checking'});setModal('account')}, openAccountEdit=a=>{setForm({...a});setModal('account')}",
    " const openAccountAdd=()=>{setForm({type:'checking'});setModal('account')}, openAccountEdit=a=>{setForm({...a,nextDueDate:cardDueDate(a),statementDate:cardStatementDate(a)});setModal('account')}",
    'account edit dates'
  )

  code = replaceOrThrow(
    code,
    " const addPayment=e=>{e.preventDefault();const amount=Number(form.amount),card=account(form.cardId),bank=account(form.bankId);if(!card||!bank||card.type!=='credit'||bank.type==='credit'||!amount||amount<=0)return;const historical=Boolean(form.historical),actual=historical?amount:Math.min(amount,Number(card.balance));const accounts=historical?data.accounts:data.accounts.map(a=>a.id===card.id?{...a,balance:Math.max(0,Number(a.balance)-actual)}:a.id===bank.id?{...a,balance:Number(a.balance)-actual}:a);const p={id:crypto.randomUUID(),date:new Date(`${form.date||dateValue()}T12:00:00`).toISOString(),cardId:card.id,cardName:card.name,bankId:bank.id,bankName:bank.name,amount:actual,kind:'payment',historical};update({...data,accounts,payments:[p,...data.payments]});setModal(null);setForm({})}",
    " const addPayment=e=>{e.preventDefault();const amount=Number(form.amount),card=account(form.cardId),bank=account(form.bankId);if(!card||!bank||card.type!=='credit'||bank.type==='credit'||!amount||amount<=0)return;const historical=Boolean(form.historical),actual=historical?amount:Math.min(amount,Number(card.balance)),dueBefore=cardDueDate(card),paidBefore=Number(card.cyclePaidAmount||0),minimum=Number(card.minimum||0),remainingBefore=Math.max(0,minimum-paidBefore),minimumApplied=historical?0:Math.min(actual,remainingBefore),extraApplied=historical?0:Math.max(0,actual-minimumApplied),cycleComplete=!historical&&minimum>0&&(paidBefore+minimumApplied)>=minimum;const accounts=historical?data.accounts:data.accounts.map(a=>a.id===card.id?{...a,balance:Math.max(0,Number(a.balance)-actual),nextDueDate:cycleComplete?addMonth(dueBefore):dueBefore,statementDate:cardStatementDate(a),cyclePaidAmount:cycleComplete?0:paidBefore+minimumApplied,lastPaidDueDate:cycleComplete?dueBefore:a.lastPaidDueDate,lastCyclePaidDate:cycleComplete?(form.date||dateValue()):a.lastCyclePaidDate}:a.id===bank.id?{...a,balance:Number(a.balance)-actual}:a);const p={id:crypto.randomUUID(),date:new Date(`${form.date||dateValue()}T12:00:00`).toISOString(),cardId:card.id,cardName:card.name,bankId:bank.id,bankName:bank.name,amount:actual,kind:'payment',historical,minimumApplied,extraApplied,cycleDueDateBefore:dueBefore,cyclePaidBefore:paidBefore,cycleAdvanced:cycleComplete,lastPaidDueDateBefore:card.lastPaidDueDate||'',lastCyclePaidDateBefore:card.lastCyclePaidDate||''};update({...data,accounts,payments:[p,...data.payments]});setModal(null);setForm({})}",
    'payment cycle logic'
  )

  code = replaceOrThrow(
    code,
    " const saveAccount=e=>{e.preventDefault();if(!form.name?.trim())return;const item={id:form.id||crypto.randomUUID(),name:form.name.trim(),type:form.type||'checking',balance:Number(form.balance||0),apr:Number(form.apr||0),minimum:Number(form.minimum||0),limit:Number(form.limit||0),dueDay:Number(form.dueDay||0),statementDay:Number(form.statementDay||0)};update({...data,accounts:form.id?data.accounts.map(a=>a.id===form.id?item:a):[...data.accounts,item]});setModal(null);setForm({})}",
    " const saveAccount=e=>{e.preventDefault();if(!form.name?.trim())return;const old=form.id?account(form.id):null;const item={id:form.id||crypto.randomUUID(),name:form.name.trim(),type:form.type||'checking',balance:Number(form.balance||0),apr:Number(form.apr||0),minimum:Number(form.minimum||0),limit:Number(form.limit||0),nextDueDate:form.type==='credit'?(form.nextDueDate||cardDueDate(old)||''):'',statementDate:form.type==='credit'?(form.statementDate||cardStatementDate(old)||''):'',cyclePaidAmount:Number(old?.cyclePaidAmount||0),lastPaidDueDate:old?.lastPaidDueDate||'',lastCyclePaidDate:old?.lastCyclePaidDate||''};update({...data,accounts:form.id?data.accounts.map(a=>a.id===form.id?item:a):[...data.accounts,item]});setModal(null);setForm({})}",
    'save account dates'
  )

  code = replaceOrThrow(
    code,
    " const removePayment=p=>{if(!confirm(`Remove the ${money2.format(p.amount)} payment to ${p.cardName}?${p.historical?'':' This restores both balances.'}`))return;let accounts=data.accounts;if(!p.historical)accounts=accounts.map(a=>a.id===p.bankId?{...a,balance:Number(a.balance)+Number(p.amount)}:a.id===p.cardId?{...a,balance:Number(a.balance)+Number(p.amount)}:a);update({...data,accounts,payments:data.payments.filter(x=>x.id!==p.id)})}",
    " const removePayment=p=>{if(!confirm(`Remove the ${money2.format(p.amount)} payment to ${p.cardName}?${p.historical?'':' This restores both balances and its billing-cycle status.'}`))return;let accounts=data.accounts;if(!p.historical)accounts=accounts.map(a=>a.id===p.bankId?{...a,balance:Number(a.balance)+Number(p.amount)}:a.id===p.cardId?{...a,balance:Number(a.balance)+Number(p.amount),nextDueDate:p.cycleDueDateBefore||a.nextDueDate,cyclePaidAmount:Number(p.cyclePaidBefore||0),lastPaidDueDate:p.lastPaidDueDateBefore||'',lastCyclePaidDate:p.lastCyclePaidDateBefore||''}:a);update({...data,accounts,payments:data.payments.filter(x=>x.id!==p.id)})}",
    'payment reversal'
  )

  code = replaceOrThrow(
    code,
    "{a.type==='credit'&&<small>{a.apr}% APR · {money.format(a.minimum)} minimum · {a.limit?Math.round(a.balance/a.limit*100):0}% utilization{a.dueDay?` · due ${a.dueDay}`:''}</small>}",
    "{a.type==='credit'&&<small>{a.apr}% APR · {money.format(a.minimum)} minimum · {a.limit?Math.round(a.balance/a.limit*100):0}% utilization · Next due {dateLabel(cardDueDate(a))}</small>}",
    'account date display'
  )

  code = replaceOrThrow(
    code,
    "{page==='debts'&&<PageHead title=\"Debts\" text=\"Current balances drive your payoff plan; payment history shows your real effort.\" action=\"Log card payment\" onClick={openPayment}>{orderDebts(payoffDebts,data.strategy).map((d,i)=><div className=\"debt-row\" key={d.id}><div className=\"rank\">{i+1}</div><div><strong>{d.name}</strong><small>{d.apr}% APR · {money.format(d.minimum)} minimum</small></div><b>{money.format(d.balance)}</b></div>)}",
    "{page==='debts'&&<PageHead title=\"Debts\" text=\"Current balances drive your payoff plan; payment history shows your real effort.\" action=\"Log card payment\" onClick={openPayment}>{orderDebts(payoffDebts,data.strategy).map((d,i)=>{const card=account(d.id),status=cycleStatus(card);return <div className=\"debt-row debt-cycle-row\" key={d.id}><div className=\"rank\">{i+1}</div><div className=\"debt-cycle-main\"><strong>{d.name}</strong><small>{d.apr}% APR · {money.format(d.minimum)} minimum</small><div className=\"cycle-meta\"><span>Next due <b>{dateLabel(cardDueDate(card))}</b></span><span>Statement closes <b>{dateLabel(cardStatementDate(card))}</b></span><span className={`cycle-status ${status.label==='Due'?'due':status.label==='Partially paid'?'partial':'paid'}`}>{status.label}{status.label==='Partially paid'?` · ${money.format(status.remaining)} remaining`:''}</span></div></div><b>{money.format(d.balance)}</b><div className=\"icon-actions debt-actions\"><IconButton label=\"Edit card\" onClick={()=>openAccountEdit(card)}><Pencil size={15}/></IconButton><IconButton label=\"Remove card\" danger onClick={()=>removeAccount(card)}><Trash2 size={15}/></IconButton></div></div>})} ",
    'debt controls and cycle display'
  )

  code = replaceOrThrow(
    code,
    "<input type=\"number\" min=\"0\" value={data.extra} onChange={e=>setExtra(e.target.value)}/>",
    "<input type=\"number\" inputMode=\"decimal\" step=\".01\" min=\"0\" value={data.extra} onChange={e=>setExtra(e.target.value)}/>",
    'payoff decimal input'
  )

  code = replaceOrThrow(
    code,
    "<div className=\"form-row\"><Field label=\"Due day\"><input type=\"number\" min=\"1\" max=\"31\" value={form.dueDay??''} onChange={e=>setForm({...form,dueDay:e.target.value})}/></Field><Field label=\"Statement day\"><input type=\"number\" min=\"1\" max=\"31\" value={form.statementDay??''} onChange={e=>setForm({...form,statementDay:e.target.value})}/></Field></div>",
    "<div className=\"form-row\"><Field label=\"Next payment due\"><input type=\"date\" value={form.nextDueDate||''} onChange={e=>setForm({...form,nextDueDate:e.target.value})}/></Field><Field label=\"Statement closing date\"><input type=\"date\" value={form.statementDate||''} onChange={e=>setForm({...form,statementDate:e.target.value})}/></Field></div>",
    'card date inputs'
  )

  code = replaceOrThrow(
    code,
    "<Field label=\"Payment amount\"><input type=\"number\" inputMode=\"decimal\" step=\".01\" min=\".01\" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/></Field>",
    "<Field label=\"Payment amount\"><input type=\"number\" inputMode=\"decimal\" step=\".01\" min=\".01\" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/></Field>{!form.historical&&form.cardId&&(()=>{const c=account(form.cardId),s=cycleStatus(c);return <div className=\"payment-cycle-note\"><strong>{s.label}</strong><span>{s.label==='Partially paid'?`${money.format(s.remaining)} of this cycle's minimum remains.`:`Minimum due ${money.format(c?.minimum||0)} · Next due ${dateLabel(cardDueDate(c))}`}</span></div>})()}",
    'payment cycle note'
  )

  return code
}
