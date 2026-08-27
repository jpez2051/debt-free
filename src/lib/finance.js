// Money is calculated in integer cents; dates identifying obligations are local calendar dates.
export const cents = value => Math.round(Number(value || 0) * 100)
export const dollars = value => value / 100
export const localDate = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
export function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && localDate(date) === value
}
export function dueInMonth(year, month, day) {
  return localDate(new Date(year, month, Math.min(Math.max(Number(day)||1,1),new Date(year,month+1,0).getDate()),12))
}
export function nextBillDate(date, bill) {
  const d = new Date(`${date}T12:00:00`)
  const annualDay=calendarDate(bill.nextDueDate)?new Date(`${bill.nextDueDate}T12:00:00`).getDate():d.getDate()
  return dueInMonth(d.getFullYear()+(bill.frequency==='annual'?1:0),d.getMonth()+(bill.frequency==='annual'?0:1),bill.frequency==='annual'?annualDay:bill.dueDay||d.getDate())
}
export const transactionDay = entry => entry.localDate || localDate(new Date(entry.date))
const sum = entries => dollars(entries.reduce((total,p)=>total+cents(p.amount),0))
const posted = (p, now) => transactionDay(p) <= localDate(now)

export function prepareData(source, now = new Date()) {
  const data = structuredClone(source)
  for (const key of ['accounts','transactions','payments','bills','billPayments','creditScores','cardStatements','billCycles','adjustments']) data[key] ||= []
  const migrating = data.financeVersion !== 1
  for (const card of data.accounts.filter(a=>a.type==='credit')) {
    if (!data.cardStatements.some(s=>s.cardId===card.id)) {
      const dates = [...new Set(data.payments.filter(p=>p.cardId===card.id&&calendarDate(p.cycleDueDateBefore)).map(p=>p.cycleDueDateBefore))]
      if (calendarDate(card.nextDueDate)) dates.push(card.nextDueDate)
      else if(card.dueDay) dates.push(dueInMonth(now.getFullYear(),now.getMonth(),card.dueDay))
      for (const dueDate of new Set(dates)) data.cardStatements.push({id:`statement-${card.id}-${dueDate}`,cardId:card.id,dueDate,minimum:Number(card.minimum)||0,needsReview:migrating,imported:true})
    }
  }
  // Older releases did not distinguish inferred assignments from user choices.
  // Preserve the old link for review, but never infer which minimum a payment satisfies.
  for (const payment of data.payments) {
    if (!['confirmed','unassigned'].includes(payment.assignmentStatus)) {
      if (payment.statementId) payment.previousStatementId=payment.statementId
      payment.statementId=''
      payment.assignmentStatus='unassigned'
    }
  }
  for (const bill of data.bills) {
    if(!data.billCycles.some(c=>c.billId===bill.id)) {
      const dueDate=calendarDate(bill.nextDueDate)?bill.nextDueDate:dueInMonth(now.getFullYear(),now.getMonth(),bill.dueDay)
      data.billCycles.push({id:`cycle-${bill.id}-${dueDate}`,billId:bill.id,dueDate,expectedAmount:Number(bill.amount),actualAmount:null,needsReview:migrating})
    }
    // Preserve legacy amounts and assignments without pretending we know old invoices.
    for(const payment of data.billPayments.filter(p=>p.billId===bill.id&&!p.cycleId)) {
      const day=transactionDay(payment),d=new Date(`${day}T12:00:00`)
      let dueDate=bill.frequency==='annual'?(bill.nextDueDate||day):dueInMonth(d.getFullYear(),d.getMonth(),bill.dueDay)
      if(dueDate<day) dueDate=nextBillDate(dueDate,bill)
      let cycle=data.billCycles.find(c=>c.billId===bill.id&&c.dueDate===dueDate)
      if(!cycle){cycle={id:`cycle-${bill.id}-${dueDate}`,billId:bill.id,dueDate,expectedAmount:Number(bill.amount),actualAmount:null,needsReview:true};data.billCycles.push(cycle)}
      payment.cycleId=cycle.id
    }
    if(bill.active===false) continue
    let latest=data.billCycles.filter(c=>c.billId===bill.id).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).at(-1)
    for(let count=0;latest.dueDate<localDate(now)&&count<1200;count++) {
      const dueDate=nextBillDate(latest.dueDate,bill)
      latest={id:`cycle-${bill.id}-${dueDate}`,billId:bill.id,dueDate,expectedAmount:Number(bill.amount),actualAmount:null,needsReview:false}
      data.billCycles.push(latest)
    }
  }
  data.financeVersion=1
  return data
}

export function statementTotals(statement, payments, now=new Date()) {
  const actualPaid=sum(payments.filter(p=>p.assignmentStatus==='confirmed'&&p.statementId===statement.id&&p.cardId===statement.cardId&&posted(p,now)))
  return {required:statement.minimum,actualPaid,paid:Math.min(statement.minimum,actualPaid),remaining:dollars(Math.max(0,cents(statement.minimum)-cents(actualPaid)))}
}
export function cycleTotals(cycle, payments, now=new Date()) {
  const required=cycle.actualAmount??cycle.expectedAmount,actualPaid=sum(payments.filter(p=>p.cycleId===cycle.id&&posted(p,now)))
  return {required,actualPaid,paid:actualPaid,remaining:dollars(Math.max(0,cents(required)-cents(actualPaid)))}
}
export function trackedObligations(data, now=new Date()) {
  const today=localDate(now),find=id=>data.accounts.find(a=>a.id===id)
  const cards=data.cardStatements.filter(s=>!s.supersededBy).map(s=>{const totals=statementTotals(s,data.payments,now);return {...s,...totals,statementId:s.id,id:`card-${s.id}`,kind:'card',name:`${find(s.cardId)?.name||'Card'} minimum`,dueDate:new Date(`${s.dueDate}T12:00:00`),dateKey:s.dueDate}}).filter(s=>s.remaining>0||s.dateKey>=today||s.needsReview)
  const bills=data.billCycles.map(c=>{const bill=data.bills.find(b=>b.id===c.billId);return {...c,...cycleTotals(c,data.billPayments,now),cycleId:c.id,id:`bill-${c.id}`,kind:'bill',name:bill?.name||'Bill',active:bill?.active!==false,fundingType:find(bill?.accountId)?.type||'unassigned',accountName:find(bill?.accountId)?.name||'Unassigned',dueDate:new Date(`${c.dueDate}T12:00:00`),dateKey:c.dueDate}}).filter(c=>(c.active||c.dateKey<=today)&&(c.remaining>0||c.dateKey>=today||c.needsReview))
  return [...cards,...bills].sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.name.localeCompare(b.name))
}
export function cashAfterObligations(data, now=new Date()) {
  // Only cash-funded bills and confirmed card minimums consume this estimate.
  // Card charges already live in debt balances; reserving them again has no release rule.
  const obligations=trackedObligations(data,now)
  const cash=data.accounts.filter(a=>a.type!=='credit').reduce((n,a)=>n+cents(a.balance),0)
  const reserved=obligations.filter(o=>o.kind==='card'||o.fundingType!=='credit').reduce((n,o)=>n+cents(o.remaining),0)
  return dollars(cash-reserved)
}
function amount(value, allowZero=false) {
  const n=Number(value)
  if(!Number.isFinite(n)||n<(allowZero?0:0.01)||Math.abs(n*100-Math.round(n*100))>0.00001) throw new Error('Enter a valid amount with at most two decimal places.')
  return dollars(cents(n))
}
function dateFields(value, now) {
  if(!calendarDate(value)||value>localDate(now)) throw new Error('Use today or an earlier date for recorded activity. Future activity is not a completed payment.')
  return {localDate:value,date:new Date(`${value}T12:00:00`).toISOString()}
}
function changeBalance(data,id,delta) {
  data.accounts=data.accounts.map(a=>a.id===id?{...a,balance:dollars(cents(a.balance)+delta)}:a)
}
export function recordCardPayment(source, form, now=new Date()) {
  const data=prepareData(source,now),card=data.accounts.find(a=>a.id===form.cardId&&a.type==='credit'),bank=data.accounts.find(a=>a.id===form.bankId&&a.type!=='credit'),statement=data.cardStatements.find(s=>s.id===form.statementId&&s.cardId===form.cardId)
  if(!card||!bank||(form.statementId&&!statement)) throw new Error('Choose a cash account and card, and a statement belonging to that card or Unassigned.')
  const value=amount(form.amount),historical=Boolean(form.historical)
  const p={id:crypto.randomUUID(),...dateFields(form.date,now),cardId:card.id,cardName:card.name,bankId:bank.id,bankName:bank.name,amount:value,kind:'payment',historical,statementId:statement?.id||'',assignmentStatus:statement?'confirmed':'unassigned',cycleDueDateBefore:statement?.dueDate,cycleAdvanced:false}
  if(!historical){changeBalance(data,bank.id,-cents(value));changeBalance(data,card.id,-cents(value))}
  data.payments.unshift(p)
  return data
}
export function removeCardPayment(source,id,now=new Date()) {
  const data=prepareData(source,now),p=data.payments.find(p=>p.id===id)
  if(!p) throw new Error('Payment not found.')
  if(!p.historical){changeBalance(data,p.bankId,cents(p.amount));changeBalance(data,p.cardId,cents(p.amount))}
  data.payments=data.payments.filter(p=>p.id!==id)
  return data
}
export function recordBillPayment(source,form,now=new Date()) {
  const data=prepareData(source,now),cycle=data.billCycles.find(c=>c.id===form.cycleId),bill=data.bills.find(b=>b.id===cycle?.billId),funding=data.accounts.find(a=>a.id===form.bankId)
  if(!cycle||!bill||!funding) throw new Error('Choose a bill occurrence and payment account.')
  const value=amount(form.amount),historical=Boolean(form.historical)
  if(form.confirmActual) cycle.actualAmount=amount(form.actualAmount,true)
  const p={id:crypto.randomUUID(),...dateFields(form.date,now),cycleId:cycle.id,billId:bill.id,billName:bill.name,category:bill.category||'Other',bankId:funding.id,bankName:funding.name,fundingType:funding.type,amount:value,historical}
  if(!historical) changeBalance(data,funding.id,(funding.type==='credit'?1:-1)*cents(value))
  data.billPayments.unshift(p)
  return data
}
export function saveStatement(source,form,now=new Date()) {
  const data=prepareData(source,now)
  if(!data.accounts.some(a=>a.id===form.cardId&&a.type==='credit')||!calendarDate(form.dueDate)) throw new Error('Choose a card and valid statement due date.')
  const minimum=amount(form.minimum,true),old=data.cardStatements.find(s=>s.id===form.id)
  if(data.cardStatements.some(s=>s.id!==form.id&&s.cardId===form.cardId&&s.dueDate===form.dueDate)) throw new Error('A statement already exists for this card and due date.')
  if(old&&old.cardId!==form.cardId) throw new Error('A statement cannot be moved to another card.')
  const item={...old,id:old?.id||crypto.randomUUID(),cardId:form.cardId,dueDate:form.dueDate,minimum,needsReview:false}
  data.cardStatements=old?data.cardStatements.map(s=>s.id===old.id?item:s):[...data.cardStatements,item]
  if(form.includesPastDue)data.cardStatements=data.cardStatements.map(s=>s.id!==item.id&&s.cardId===item.cardId&&s.dueDate<item.dueDate&&!s.supersededBy&&statementTotals(s,data.payments,now).remaining>0?{...s,supersededBy:item.id}:s)
  const latest=data.cardStatements.filter(s=>s.cardId===form.cardId&&!s.needsReview).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).at(-1)
  data.accounts=data.accounts.map(a=>a.id===form.cardId?{...a,nextDueDate:latest.dueDate,minimum:latest.minimum}:a)
  return data
}
export function confirmBillCycle(source,id,value,now=new Date(),dueDate) {
  const data=prepareData(source,now),cycle=data.billCycles.find(c=>c.id===id)
  if(!cycle) throw new Error('Bill occurrence not found.')
  if(dueDate!==undefined){if(!calendarDate(dueDate))throw new Error('Enter a valid due date.');if(data.billCycles.some(c=>c.id!==id&&c.billId===cycle.billId&&c.dueDate===dueDate))throw new Error('This bill already has an occurrence on that date.');cycle.dueDate=dueDate}
  cycle.actualAmount=amount(value,true);cycle.needsReview=false
  return data
}
export function removeStatement(source,id,now=new Date()) {
  const data=prepareData(source,now),statement=data.cardStatements.find(s=>s.id===id)
  if(!statement)throw new Error('Statement not found.')
  if(data.payments.some(p=>p.statementId===id))throw new Error('Reassign this statement’s payments or leave them unassigned before removing it.')
  data.cardStatements=data.cardStatements.filter(s=>s.id!==id).map(s=>s.supersededBy===id?{...s,supersededBy:undefined}:s)
  const latest=data.cardStatements.filter(s=>s.cardId===statement.cardId).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).at(-1)
  data.accounts=data.accounts.map(a=>a.id===statement.cardId?{...a,nextDueDate:latest?.dueDate||'',dueDay:0,minimum:latest?.minimum||0}:a)
  return data
}
export function reassignPayment(source,id,targetId,kind,now=new Date()) {
  if(kind==='card')return assignCardPayments(source,[id],targetId,now)
  const data=prepareData(source,now),p=data.billPayments.find(p=>p.id===id),target=data.billCycles.find(x=>x.id===targetId)
  if(kind!=='bill'||!p||!target||p.billId!==target.billId) throw new Error('Choose an occurrence belonging to the same bill.')
  p.cycleId=targetId
  return data
}
export function assignCardPayments(source,ids,targetId,now=new Date()) {
  const data=prepareData(source,now)
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw new Error('Select one or more payments.')
  const payments=ids.map(id=>data.payments.find(p=>p.id===id))
  if(payments.some(p=>!p)||new Set(payments.map(p=>p.cardId)).size!==1)throw new Error('Select payments belonging to one card.')
  const target=data.cardStatements.find(s=>s.id===targetId&&s.cardId===payments[0].cardId)
  if(targetId&&!target)throw new Error('Choose a statement belonging to the selected card.')
  for(const payment of payments){
    payment.statementId=target?.id||''
    payment.assignmentStatus=target?'confirmed':'unassigned'
    // Keep original dates/amounts and legacy cycle metadata intact for auditability.
  }
  return data
}
export function reconcileAccount(source,form,now=new Date()) {
  const data=prepareData(source,now),a=data.accounts.find(a=>a.id===form.accountId),balance=Number(form.balance)
  if(!a||form.balance===''||form.balance==null||!Number.isFinite(balance)||Math.abs(balance*100-Math.round(balance*100))>0.00001||!form.reason?.trim()) throw new Error('Choose an account, enter its actual balance with at most two decimal places, and explain the adjustment.')
  const delta=cents(balance)-cents(a.balance)
  data.adjustments.unshift({id:crypto.randomUUID(),accountId:a.id,before:a.balance,after:dollars(cents(balance)),delta:dollars(delta),reason:form.reason.trim(),date:now.toISOString()})
  changeBalance(data,a.id,delta)
  data.accounts=data.accounts.map(x=>x.id===a.id?{...x,reconciledAt:now.toISOString()}:x)
  return data
}
export function recordRefund(source,form,now=new Date()) {
  const data=prepareData(source,now),a=data.accounts.find(a=>a.id===form.accountId),value=amount(form.amount)
  if(!a||!form.merchant?.trim()) throw new Error('Choose an account and enter the merchant.')
  data.transactions.unshift({id:crypto.randomUUID(),...dateFields(form.date,now),kind:'refund',accountId:a.id,merchant:form.merchant.trim(),category:form.category||'Other',amount:value,historical:Boolean(form.historical)})
  if(!form.historical) changeBalance(data,a.id,(a.type==='credit'?-1:1)*cents(value))
  return data
}

function transactionEffect(entry, account) {
  const sign=entry.kind==='refund'?(account.type==='credit'?-1:1):entry.kind==='income'?1:entry.kind==='transfer'?-1:account.type==='credit'?1:-1
  return sign*cents(entry.amount)
}
export function saveLedgerTransaction(source,form,kind,now=new Date()) {
  const data=prepareData(source,now),account=data.accounts.find(a=>a.id===form.accountId),value=amount(form.amount),old=data.transactions.find(t=>t.id===form.id)
  if(!account)throw new Error('Choose an account.')
  if(['income','transfer'].includes(kind)&&account.type==='credit')throw new Error('Choose a cash account for income or external transfers.')
  if(old&&!old.historical){const previous=data.accounts.find(a=>a.id===old.accountId);changeBalance(data,previous.id,-transactionEffect(old,previous))}
  const item={id:old?.id||crypto.randomUUID(),...dateFields(form.date,now),kind,accountId:account.id,merchant:(form.merchant||({income:'Income',transfer:'External transfer',purchase:'Expense',refund:'Refund'}[kind])).trim(),amount:value,category:kind==='income'?'Income':kind==='transfer'?'Transfer':form.category||'Other',historical:Boolean(form.historical)}
  if(!item.historical)changeBalance(data,account.id,transactionEffect(item,account))
  data.transactions=old?data.transactions.map(t=>t.id===old.id?item:t):[item,...data.transactions]
  return data
}
export function removeLedgerTransaction(source,id,now=new Date()) {
  const data=prepareData(source,now),old=data.transactions.find(t=>t.id===id)
  if(!old)throw new Error('Entry not found.')
  if(!old.historical){const account=data.accounts.find(a=>a.id===old.accountId);changeBalance(data,account.id,-transactionEffect(old,account))}
  data.transactions=data.transactions.filter(t=>t.id!==id)
  return data
}
export function removeRecurringPayment(source,id,now=new Date()) {
  const data=prepareData(source,now),p=data.billPayments.find(p=>p.id===id)
  if(!p)throw new Error('Entry not found.')
  if(!p.historical){const a=data.accounts.find(a=>a.id===p.bankId);changeBalance(data,a.id,(a.type==='credit'?-1:1)*cents(p.amount))}
  data.billPayments=data.billPayments.filter(p=>p.id!==id)
  return data
}

export function netSpendingEntries(data) {
  return [...data.transactions.filter(t=>t.kind==='purchase'||t.kind==='refund').map(t=>({...t,amount:t.kind==='refund'?-Number(t.amount):Number(t.amount)})),...data.billPayments.map(p=>({...p,merchant:p.billName,category:p.category||'Other',accountId:p.bankId,kind:'purchase'}))]
}
