import { categorizeSpendingEntry, TRANSFER_PURPOSES } from './categories.js'
import { allocateRefund, refundReportingParts } from './refundAllocation.js'
import { expandSplits, validateSplits } from './splitSpending.js'
import { amendedBillSchedule, billCadenceChange, billScheduleAt } from './billSchedule.js'

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
  const annualDay=new Date(`${bill.recurrenceAnchorDate||bill.nextDueDate||date}T12:00:00`).getDate()
  return dueInMonth(d.getFullYear()+(bill.frequency==='annual'?1:0),bill.frequency==='annual'?new Date(`${bill.recurrenceAnchorDate||bill.nextDueDate||date}T12:00:00`).getMonth():d.getMonth()+1,bill.frequency==='annual'?annualDay:bill.dueDay||d.getDate())
}
export const transactionDay = entry => entry.localDate || localDate(new Date(entry.date))
const sum = entries => dollars(entries.reduce((total,p)=>total+cents(p.amount),0))
const posted = (p, now) => p.status!=='pending'&&transactionDay(p) <= localDate(now)

// An older bill workflow could append the same deterministic occurrence twice.
// Only discard an empty twin when the other copy has the same bill/date/estimate
// and contains the confirmed actual amount. Payments keep their original ID.
export function repairDuplicateBillCycles(source) {
  const cycles=source.billCycles||[],groups=new Map()
  cycles.forEach((cycle,index)=>groups.set(cycle.id,[...(groups.get(cycle.id)||[]),{cycle,index}]))
  const remove=new Set(),audit=[]
  for(const group of groups.values()){
    if(group.length!==2)continue
    const [first,second]=group.map(item=>item.cycle)
    if(first.billId!==second.billId||first.dueDate!==second.dueDate||cents(first.expectedAmount)!==cents(second.expectedAmount))continue
    const confirmed=group.find(item=>item.cycle.actualAmount!=null&&!item.cycle.needsReview)
    const empty=group.find(item=>item.cycle.actualAmount==null&&!item.cycle.needsReview)
    if(confirmed&&empty&&confirmed.index!==empty.index){
      remove.add(empty.index)
      audit.push({kind:'empty-duplicate-bill-occurrence',billId:empty.cycle.billId,dueDate:empty.cycle.dueDate,keptId:confirmed.cycle.id,removedRecord:empty.cycle})
    }
  }
  if(!remove.size)return {data:source,repaired:0}
  return {data:{...source,billCycles:cycles.filter((_,index)=>!remove.has(index)),repairHistory:[...(source.repairHistory||[]),...audit]},repaired:remove.size}
}

export function prepareData(source, now = new Date()) {
  const data = structuredClone(repairDuplicateBillCycles(source).data)
  for (const key of ['accounts','transactions','payments','bills','billPayments','creditScores','cardStatements','billCycles','adjustments','incomeSchedules']) data[key] ||= []
  data.dataHealthAcknowledgements ||= []
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
    if (!['confirmed','unassigned','general','extra'].includes(payment.assignmentStatus)) {
      if (payment.statementId) payment.previousStatementId=payment.statementId
      payment.statementId=''
      payment.assignmentStatus=payment.historical?'general':'unassigned'
    }
    if(payment.historical&&payment.assignmentStatus==='unassigned'&&!payment.statementId)payment.assignmentStatus='general'
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
    const today=localDate(now),billCycles=data.billCycles.filter(c=>c.billId===bill.id),paidCycleIds=new Set(data.billPayments.filter(p=>p.billId===bill.id&&p.cycleId).map(p=>p.cycleId))
    const protectedFuture=billCycles.filter(c=>c.dueDate>=today&&(c.actualAmount!=null||c.needsReview||paidCycleIds.has(c.id)))
    const editableFuture=billCycles.filter(c=>c.dueDate>=today&&(!bill.scheduleEffectiveDate||c.dueDate>=bill.scheduleEffectiveDate)&&c.actualAmount==null&&!c.needsReview&&!paidCycleIds.has(c.id)&&(!c.status||c.status==='normal'))
    if(!protectedFuture.length&&editableFuture.length){
      let expectedDate=calendarDate(bill.nextDueDate)?bill.nextDueDate:dueInMonth(now.getFullYear(),now.getMonth(),bill.dueDay)
      for(let count=0;expectedDate<today&&count<1200;count++)expectedDate=nextBillDate(expectedDate,bill)
      const synchronized=editableFuture.length===1&&editableFuture[0].dueDate===expectedDate&&cents(editableFuture[0].expectedAmount)===cents(bill.amount)
      if(!synchronized){
        const editableIds=new Set(editableFuture.map(c=>c.id));data.billCycles=data.billCycles.filter(c=>!editableIds.has(c.id))
        data.billCycles.push({id:`cycle-${bill.id}-${expectedDate}`,billId:bill.id,dueDate:expectedDate,expectedAmount:Number(bill.amount),actualAmount:null,needsReview:false})
      }
      bill.nextDueDate=expectedDate
    }
    if(bill.recurrenceAnchorDate){
      for(const segment of bill.scheduleHistory||[]){
        const saved=data.billCycles.filter(c=>c.billId===bill.id&&c.dueDate>=segment.anchorDate&&c.dueDate>=segment.effectiveDate&&c.dueDate<segment.until).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).at(-1)
        let date=saved?.dueDate||segment.anchorDate
        const prior={frequency:segment.frequency,dueDay:segment.dueDay,recurrenceAnchorDate:segment.anchorDate}
        for(let count=0;count<1200&&date<segment.until&&(!bill.cancelFrom||date<bill.cancelFrom);count++){
          if(date>=segment.effectiveDate&&!data.billCycles.some(c=>c.billId===bill.id&&(c.dueDate===date||segment.frequency==='monthly'&&c.dueDate>=segment.effectiveDate&&c.dueDate<segment.until&&c.dueDate.slice(0,7)===date.slice(0,7))))data.billCycles.push({id:`cycle-${bill.id}-${date}`,billId:bill.id,dueDate:date,expectedAmount:Number(segment.amount),actualAmount:null,needsReview:false})
          if(date>=today)break
          date=nextBillDate(date,prior)
        }
      }
      let expectedDate=bill.nextDueDate||bill.recurrenceAnchorDate
      for(let count=0;count<1200;count++){
        if(expectedDate>=bill.scheduleEffectiveDate&&(!bill.cancelFrom||expectedDate<bill.cancelFrom)&&!data.billCycles.some(c=>c.billId===bill.id&&(c.dueDate===expectedDate||bill.frequency==='monthly'&&c.dueDate>=bill.scheduleEffectiveDate&&c.dueDate.slice(0,7)===expectedDate.slice(0,7))))data.billCycles.push({id:`cycle-${bill.id}-${expectedDate}`,billId:bill.id,dueDate:expectedDate,expectedAmount:Number(bill.amount),actualAmount:null,needsReview:false})
        if(expectedDate>=today)break
        expectedDate=nextBillDate(expectedDate,bill)
      }
      bill.nextDueDate=expectedDate
      continue
    }
    let latest=data.billCycles.filter(c=>c.billId===bill.id).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).at(-1)
    for(let count=0;latest.dueDate<localDate(now)&&count<1200;count++) {
      const dueDate=nextBillDate(latest.dueDate,bill)
      if(bill.cancelFrom&&dueDate>=bill.cancelFrom)break
      latest={id:`cycle-${bill.id}-${dueDate}`,billId:bill.id,dueDate,expectedAmount:Number(bill.amount),actualAmount:null,needsReview:false}
      data.billCycles.push(latest)
    }
  }
  data.financeVersion=1
  return data
}

export function hasDuplicateLedgerTransaction(source,form,kind){
  const destination=kind==='transfer'&&form.toAccountId?(source.accounts||[]).find(a=>a.id===form.toAccountId):null
  const merchant=String(destination?.name||form.merchant||({income:'Income',transfer:'External transfer',purchase:'Expense',refund:'Refund'}[kind]||'')).trim().toLocaleLowerCase()
  return (source.transactions||[]).some(item=>item.id!==form.id&&item.kind===kind&&item.accountId===form.accountId&&transactionDay(item)===(form.date||'')&&cents(item.amount)===cents(form.amount)&&String(item.merchant||'').trim().toLocaleLowerCase()===merchant&&(kind!=='transfer'||(item.toAccountId||'')===(form.toAccountId||'')))
}

export function saveRecurringBill(source,form,now=new Date()){
  if(!form.name?.trim()||cents(form.amount)<=0)throw new Error('Enter a bill name and an amount greater than zero.')
  const data=prepareData(source,now),old=form.id?data.bills.find(b=>b.id===form.id):null,today=localDate(now),requestedDate=form.nextDueDate||today
  if(!calendarDate(requestedDate))throw new Error('Choose a valid next due date.')
  if(form.cancelFrom&&!calendarDate(form.cancelFrom))throw Error('Choose a valid cancellation-effective date.')
  const item={...old,id:old?.id||crypto.randomUUID(),name:form.name.trim(),amount:dollars(cents(form.amount)),dueDay:old&&!billCadenceChange(old,form)?Number(old.dueDay)||new Date(`${requestedDate}T12:00:00`).getDate():new Date(`${requestedDate}T12:00:00`).getDate(),nextDueDate:requestedDate,frequency:form.frequency==='annual'?'annual':'monthly',autopay:Boolean(form.autopay),category:form.category||'Other',subcategory:form.subcategory||'',accountId:form.accountId||'',active:form.active!==false,...amendedBillSchedule(old,{...form,nextDueDate:requestedDate},data.billCycles,now),cancelFrom:form.cancelFrom||''}
  for(let count=0;item.nextDueDate<today&&count<1200;count++)item.nextDueDate=nextBillDate(item.nextDueDate,item)
  data.bills=old?data.bills.map(b=>b.id===old.id?item:b):[...data.bills,item]
  if(old){
    const paidCycles=new Set(data.billPayments.filter(p=>p.billId===old.id&&p.cycleId).map(p=>p.cycleId))
    const pruneFrom=billCadenceChange(old,form)?item.scheduleEffectiveDate:today
    data.billCycles=data.billCycles.filter(c=>c.billId!==old.id||c.dueDate<pruneFrom||c.actualAmount!=null||c.needsReview||c.status&&c.status!=='normal'||paidCycles.has(c.id))
    if(!data.billCycles.some(c=>c.billId===old.id&&c.dueDate===item.nextDueDate))data.billCycles.push({id:`cycle-${old.id}-${item.nextDueDate}`,billId:old.id,dueDate:item.nextDueDate,expectedAmount:item.amount,actualAmount:null,needsReview:false})
  }
  return prepareData(data,now)
}

export function statementCycleMismatch(statement,payments) {
  if(!statement||!calendarDate(statement.dueDate))return ''
  return payments.filter(p=>p.assignmentStatus==='confirmed'&&p.statementId===statement.id&&p.cardId===statement.cardId)
    .map(p=>p.cycleDueDateBefore)
    .find(due=>calendarDate(due)&&due.slice(0,7)!==statement.dueDate.slice(0,7)&&statement.id.endsWith(`-${due}`))||''
}
export function statementTotals(statement, payments, now=new Date()) {
  const oldDue=statementCycleMismatch(statement,payments)
  const actualPaid=sum(payments.filter(p=>p.assignmentStatus==='confirmed'&&p.statementId===statement.id&&p.cardId===statement.cardId&&posted(p,now)&&(!oldDue||p.cycleDueDateBefore!==oldDue)))
  return {required:statement.minimum,actualPaid,paid:Math.min(statement.minimum,actualPaid),remaining:dollars(Math.max(0,cents(statement.minimum)-cents(actualPaid)))}
}
export function cycleTotals(cycle, payments, now=new Date()) {
  const required=cycle.actualAmount??cycle.expectedAmount,actualPaid=sum(payments.filter(p=>p.cycleId===cycle.id&&posted(p,now)))
  return {required,actualPaid,paid:actualPaid,remaining:['skipped','waived'].includes(cycle.status)?0:dollars(Math.max(0,cents(required)-cents(actualPaid)))}
}
export function trackedObligations(data, now=new Date()) {
  const today=localDate(now),find=id=>data.accounts.find(a=>a.id===id)
  const cards=data.cardStatements.filter(s=>!s.supersededBy).map(s=>{const totals=statementTotals(s,data.payments,now);return {...s,...totals,statementId:s.id,id:`card-${s.id}`,kind:'card',name:`${find(s.cardId)?.name||'Card'} minimum`,dueDate:new Date(`${s.dueDate}T12:00:00`),dateKey:s.dueDate}}).filter(s=>s.remaining>0||s.dateKey>=today||s.needsReview)
  const bills=data.billCycles.filter(c=>{const b=data.bills.find(b=>b.id===c.billId);return !b?.cancelFrom||c.dueDate<b.cancelFrom||c.actualAmount!=null||data.billPayments.some(p=>p.cycleId===c.id)}).map(c=>{const bill=data.bills.find(b=>b.id===c.billId);return {...c,...cycleTotals(c,data.billPayments,now),cycleId:c.id,id:`bill-${c.id}`,kind:'bill',name:bill?.name||'Bill',active:bill?.active!==false,fundingType:find(bill?.accountId)?.type||'unassigned',accountName:find(bill?.accountId)?.name||'Unassigned',dueDate:new Date(`${c.dueDate}T12:00:00`),dateKey:c.dueDate}}).filter(c=>(c.active||c.dateKey<=today)&&(c.remaining>0||c.dateKey>=today||c.needsReview))
  return [...cards,...bills].sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.name.localeCompare(b.name))
}
// The Bills page should reassure someone that this month's bill was handled,
// while the dashboard remains focused on future unpaid obligations.
export function billDisplayCycle(data,bill,now=new Date()) {
  const today=localDate(now),cycles=(data.billCycles||[]).filter(c=>c.billId===bill.id&&(!bill.cancelFrom||c.dueDate<bill.cancelFrom||c.actualAmount!=null||(data.billPayments||[]).some(p=>p.cycleId===c.id))),totals=cycle=>cycleTotals(cycle,data.billPayments||[],now)
  const overdue=cycles.filter(c=>c.dueDate<today&&totals(c).remaining>0).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]
  if(overdue)return overdue
  if(bill.frequency==='monthly'){
    const currentMonth=today.slice(0,7),current=cycles.filter(c=>c.dueDate.startsWith(currentMonth)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]
    if(current)return current
  }
  return cycles.filter(c=>c.dueDate>=today&&totals(c).remaining>0).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]
}
export function cashAfterObligations(data, now=new Date(), throughDate='') {
  // Only cash-funded bills and recorded card minimums consume this estimate.
  // Card charges already live in debt balances; reserving them again has no release rule.
  const obligations=trackedObligations(data,now)
  const cash=data.accounts.filter(a=>a.type!=='credit').reduce((n,a)=>n+cents(a.balance),0)
  const reserved=obligations.filter(o=>(!throughDate||o.dateKey<=throughDate)&&(o.kind==='card'||o.fundingType!=='credit')).reduce((n,o)=>n+cents(o.remaining),0)
  return dollars(cash-reserved)
}
export function cashThroughMonthEnd(data,now=new Date()) {
  const monthEnd=localDate(new Date(now.getFullYear(),now.getMonth()+1,0,12))
  return cashAfterObligations(data,now,monthEnd)
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
  if(!card||!bank||(form.statementId&&!statement)) throw new Error('Choose a cash account and card, and a statement belonging to that card or leave it for review.')
  const value=amount(form.amount),historical=Boolean(form.historical)
  const p={id:crypto.randomUUID(),status:!form.historical&&form.status==='pending'?'pending':'cleared',...dateFields(form.date,now),cardId:card.id,cardName:card.name,bankId:bank.id,bankName:bank.name,amount:value,kind:'payment',historical,statementId:statement?.id||'',assignmentStatus:statement?'confirmed':historical?'general':form.paymentIntent==='extra'?'extra':'unassigned',...(statement?{cycleDueDateBefore:statement.dueDate}:{}),cycleAdvanced:false}
  if(!historical&&form.status!=='pending'){changeBalance(data,bank.id,-cents(value));changeBalance(data,card.id,-cents(value))}
  data.payments.unshift(p)
  return data
}
export function removeCardPayment(source,id,now=new Date()) {
  const data=prepareData(source,now),p=data.payments.find(p=>p.id===id)
  if(!p) throw new Error('Payment not found.')
  if(!p.historical&&p.status!=='pending'){changeBalance(data,p.bankId,cents(p.amount));changeBalance(data,p.cardId,cents(p.amount))}
  data.payments=data.payments.filter(p=>p.id!==id)
  return data
}
export function recordBillPayment(source,form,now=new Date()) {
  const data=prepareData(source,now),funding=data.accounts.find(a=>a.id===form.bankId)
  let cycle=data.billCycles.find(c=>c.id===form.cycleId)
  const bill=data.bills.find(b=>b.id===(form.billId||cycle?.billId))
  if(!bill||!funding) throw new Error('Choose a bill and the account that paid it.')
  if(form.dueDate){
    if(!calendarDate(form.dueDate))throw new Error('Choose the month or due date this bill payment belongs to.')
    cycle=data.billCycles.find(c=>c.billId===bill.id&&c.dueDate===form.dueDate)
    if(!cycle){cycle={id:crypto.randomUUID(),billId:bill.id,dueDate:form.dueDate,expectedAmount:Number(billScheduleAt(bill,data.billCycles,form.dueDate)?.amount??bill.amount),actualAmount:null,needsReview:false};data.billCycles.push(cycle)}
  }
  if(!cycle||cycle.billId!==bill.id) throw new Error('Choose the month or due date this bill payment belongs to.')
  if(['skipped','waived'].includes(cycle.status))throw new Error('This bill month is skipped or waived. Remove that exception before recording a payment.')
  const value=amount(form.amount),historical=Boolean(form.historical)
  if(form.confirmActual) cycle.actualAmount=amount(form.actualAmount,true)
  const p={id:crypto.randomUUID(),status:!form.historical&&form.status==='pending'?'pending':'cleared',...dateFields(form.date,now),cycleId:cycle.id,billId:bill.id,billName:bill.name,category:bill.category||'Other',subcategory:bill.subcategory||'',bankId:funding.id,bankName:funding.name,fundingType:funding.type,amount:value,historical}
  if(!historical&&form.status!=='pending') changeBalance(data,funding.id,(funding.type==='credit'?1:-1)*cents(value))
  data.billPayments.unshift(p)
  return data
}
export function saveStatement(source,form,now=new Date()) {
  const data=prepareData(source,now)
  if(!data.accounts.some(a=>a.id===form.cardId&&a.type==='credit')||!calendarDate(form.dueDate)) throw new Error('Choose a card and valid statement due date.')
  const minimum=amount(form.minimum,true),old=data.cardStatements.find(s=>s.id===form.id)
  if(data.cardStatements.some(s=>s.id!==form.id&&s.cardId===form.cardId&&s.dueDate===form.dueDate)) throw new Error('A statement already exists for this card and due date.')
  if(old&&old.cardId!==form.cardId) throw new Error('A statement cannot be moved to another card.')
  if(old&&old.dueDate.slice(0,7)!==form.dueDate.slice(0,7)&&data.payments.some(p=>p.cardId===old.cardId&&p.statementId===old.id&&p.assignmentStatus==='confirmed')&&form.dueDate!==statementCycleMismatch(old,data.payments))throw new Error('This statement has assigned payments. Keep its original due month and add a separate statement for the next month.')
  const verification=form.issuerConfirmed===true?'issuer-confirmed':form.issuerConfirmed===false?'estimated':old?.verification||'unverified'
  const item={...old,id:old?.id||crypto.randomUUID(),cardId:form.cardId,dueDate:form.dueDate,minimum,needsReview:false,verification}
  data.cardStatements=old?data.cardStatements.map(s=>s.id===old.id?item:s):[...data.cardStatements,item]
  if(form.includesPastDue)data.cardStatements=data.cardStatements.map(s=>s.id!==item.id&&s.cardId===item.cardId&&s.dueDate<item.dueDate&&!s.supersededBy&&statementTotals(s,data.payments,now).remaining>0?{...s,supersededBy:item.id}:s)
  const latest=data.cardStatements.filter(s=>s.cardId===form.cardId&&!s.needsReview).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).at(-1)
  data.accounts=data.accounts.map(a=>a.id===form.cardId?{...a,nextDueDate:latest.dueDate,minimum:latest.minimum}:a)
  return data
}
export function repairMovedStatement(source,id,originalMinimum,now=new Date()) {
  const data=prepareData(source,now),statement=data.cardStatements.find(s=>s.id===id),originalDue=statementCycleMismatch(statement,data.payments)
  if(!originalDue)throw new Error('No moved statement cycle was found for this card.')
  if(data.cardStatements.some(s=>s.id!==id&&s.cardId===statement.cardId&&s.dueDate===originalDue))throw new Error('The original statement already exists. Review payment assignments instead.')
  if(originalMinimum==null||String(originalMinimum).trim()==='')throw new Error('Enter the original statement minimum before separating these months.')
  const originalAmount=amount(originalMinimum,true),newDue=statement.dueDate,newMinimum=statement.minimum
  const restored=saveStatement(data,{id,cardId:statement.cardId,dueDate:originalDue,minimum:originalAmount},now)
  return saveStatement(restored,{cardId:statement.cardId,dueDate:newDue,minimum:newMinimum},now)
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
  data.cardStatements=data.cardStatements.filter(s=>s.id!==id).map(s=>{if(s.supersededBy!==id)return s;const {supersededBy,...rest}=s;return rest})
  const latest=data.cardStatements.filter(s=>s.cardId===statement.cardId).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).at(-1)
  data.accounts=data.accounts.map(a=>a.id===statement.cardId?{...a,nextDueDate:latest?.dueDate||'',dueDay:0,minimum:latest?.minimum||0}:a)
  return data
}
export function reassignPayment(source,id,targetId,kind,now=new Date()) {
  if(kind==='card')return assignCardPayments(source,[id],targetId,now)
  const data=prepareData(source,now),p=data.billPayments.find(p=>p.id===id)
  let target=data.billCycles.find(x=>x.id===targetId)
  if(kind==='bill'&&p&&!target&&String(targetId).startsWith('new:')){
    const dueDate=String(targetId).slice(4),bill=data.bills.find(b=>b.id===p.billId)
    if(calendarDate(dueDate)&&bill){target={id:crypto.randomUUID(),billId:bill.id,dueDate,expectedAmount:Number(bill.amount),actualAmount:null,needsReview:false};data.billCycles.push(target)}
  }
  if(kind!=='bill'||!p||!target||p.billId!==target.billId) throw new Error('Choose an occurrence belonging to the same bill.')
  p.cycleId=targetId
  if(String(targetId).startsWith('new:'))p.cycleId=target.id
  return data
}
export function assignCardPayments(source,ids,targetId,now=new Date()) {
  const data=prepareData(source,now)
  if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw new Error('Select one or more payments.')
  const payments=ids.map(id=>data.payments.find(p=>p.id===id))
  if(payments.some(p=>!p)||new Set(payments.map(p=>p.cardId)).size!==1)throw new Error('Select payments belonging to one card.')
  const general=targetId==='__general__',extra=targetId==='__extra__',target=data.cardStatements.find(s=>s.id===targetId&&s.cardId===payments[0].cardId)
  if(targetId&&!general&&!extra&&!target)throw new Error('Choose a statement belonging to the selected card, a general payment with no statement, a historical payment with no statement, or review later.')
  for(const payment of payments){
    payment.statementId=target?.id||''
    payment.assignmentStatus=target?'confirmed':extra?'extra':general||payment.historical?'general':'unassigned'
    // Keep original dates/amounts and legacy cycle metadata intact for auditability.
  }
  return data
}
export function reconcileAccount(source,form,now=new Date()) {
  const data=prepareData(source,now),a=data.accounts.find(a=>a.id===form.accountId),balance=Number(form.balance)
  if(!a||form.balance===''||form.balance==null||!Number.isFinite(balance)||Math.abs(balance*100-Math.round(balance*100))>0.00001||!form.reason?.trim()) throw new Error('Choose an account, enter its actual balance with at most two decimal places, and explain the adjustment.')
  const delta=cents(balance)-cents(a.balance)
  if(delta) {
    data.adjustments.unshift({id:crypto.randomUUID(),accountId:a.id,before:a.balance,after:dollars(cents(balance)),delta:dollars(delta),reason:form.reason.trim(),date:now.toISOString()})
    changeBalance(data,a.id,delta)
  }
  data.accounts=data.accounts.map(x=>x.id===a.id?{...x,reconciledAt:now.toISOString(),reconciliationNeedsReview:false}:x)
  return data
}
export function recordRefund(source,form,now=new Date()) {
  const data=prepareData(source,now),a=data.accounts.find(a=>a.id===form.accountId),value=amount(form.amount),old=form.id?data.transactions.find(t=>t.id===form.id&&t.kind==='refund'):null
  if(form.id&&!old)throw Error('This refund no longer exists.')
  if(!a||!form.merchant?.trim()) throw new Error('Choose an account and enter the merchant.')
  if(form.originalTransactionId){const original=data.transactions.find(t=>t.id===form.originalTransactionId&&t.kind==='purchase'&&t.accountId===a.id);if(!original)throw Error('Choose an original expense on the same account.');const refunded=data.transactions.filter(t=>t.kind==='refund'&&t.originalTransactionId===original.id&&t.id!==old?.id).reduce((sum,t)=>sum+cents(t.amount),0);if(refunded+cents(value)>cents(original.amount))throw Error('Linked refunds cannot exceed the original expense.');if(form.date<transactionDay(original))throw Error('A refund cannot arrive before its original expense.')}
  const original=data.transactions.find(t=>t.id===form.originalTransactionId&&t.kind==='purchase'),splits=allocateRefund(data,{...form,amount:value},original)
  if(old&&!old.historical&&old.status!=='pending')applyTransactionBalances(data,old,-1)
  data.transactions=data.transactions.filter(t=>t.id!==old?.id)
  data.transactions.unshift({id:old?.id||crypto.randomUUID(),splits,status:!form.historical&&form.status==='pending'?'pending':'cleared',originalTransactionId:form.originalTransactionId||'',...dateFields(form.date,now),kind:'refund',accountId:a.id,merchant:form.merchant.trim(),category:form.category||'Other',subcategory:form.subcategory||'',amount:value,historical:Boolean(form.historical)})
  if(!form.historical&&form.status!=='pending') changeBalance(data,a.id,(a.type==='credit'?-1:1)*cents(value))
  return data
}

function transactionEffect(entry, account) {
  const sign=entry.kind==='refund'?(account.type==='credit'?-1:1):entry.kind==='income'?1:entry.kind==='transfer'?-1:account.type==='credit'?1:-1
  return sign*cents(entry.amount)
}
function applyTransactionBalances(data,entry,direction=1){
  const account=data.accounts.find(a=>a.id===entry.accountId)
  if(account)changeBalance(data,account.id,direction*transactionEffect(entry,account))
  if(entry.kind==='transfer'&&entry.toAccountId){const destination=data.accounts.find(a=>a.id===entry.toAccountId);if(destination)changeBalance(data,destination.id,direction*cents(entry.amount))}
}
export function incomeLinkAheadOfDeposit(scheduledDate,depositDate){
  return calendarDate(scheduledDate)&&calendarDate(depositDate)&&(Date.parse(scheduledDate)-Date.parse(depositDate))/86400000>7
}
export function saveLedgerTransaction(source,form,kind,now=new Date()) {
  const data=prepareData(source,now),account=data.accounts.find(a=>a.id===form.accountId),destination=kind==='transfer'&&form.toAccountId?data.accounts.find(a=>a.id===form.toAccountId):null,value=amount(form.amount),old=data.transactions.find(t=>t.id===form.id)
  if(!account)throw new Error('Choose an account.')
  if(old){const refunds=data.transactions.filter(t=>t.kind==='refund'&&t.originalTransactionId===old.id);if(refunds.length&&(kind!=='purchase'||refunds.some(t=>t.accountId!==account.id||transactionDay(t)<form.date)||refunds.reduce((sum,t)=>sum+cents(t.amount),0)>cents(value)))throw Error('This edit conflicts with linked refunds. Keep their account, date order and original amount valid.')}
  if(['income','transfer'].includes(kind)&&account.type==='credit')throw new Error('Choose a cash account for income or external transfers.')
  if(kind==='transfer'&&form.toAccountId&&!destination)throw new Error('Choose a valid tracked destination account or an outside destination.')
  if(destination&&(destination.type==='credit'||destination.id===account.id))throw new Error('Choose a different cash account as the transfer destination.')
  if(kind==='transfer'&&!destination&&!form.merchant?.trim())throw new Error('Enter the outside destination, such as Acorns.')
  if(kind==='transfer'&&!TRANSFER_PURPOSES.includes(form.transferPurpose))throw new Error('Choose what this transfer is for.')
  const incomeSchedule=kind==='income'&&form.incomeScheduleId?data.incomeSchedules.find(item=>item.id===form.incomeScheduleId):null
  if(kind==='income'&&form.incomeScheduleId&&(!incomeSchedule||!calendarDate(form.scheduledIncomeDate)))throw new Error('Choose a valid expected deposit to match this income.')
  if(incomeSchedule&&(!old||old.incomeScheduleId!==incomeSchedule.id||old.scheduledIncomeDate!==form.scheduledIncomeDate)&&data.transactions.some(t=>t.id!==old?.id&&t.kind==='income'&&t.incomeScheduleId===incomeSchedule.id&&t.scheduledIncomeDate===form.scheduledIncomeDate))throw Error('A deposit is already linked to this payday. Edit or confirm the existing deposit; record any separate actual deposit without linking it to the same payday.')
  if(incomeSchedule&&incomeLinkAheadOfDeposit(form.scheduledIncomeDate,form.date))throw new Error('This deposit is more than a week before the expected payday. Check the date or unlink the expected deposit so a future paycheck is not marked received.')
  if(old&&!old.historical&&old.status!=='pending')applyTransactionBalances(data,old,-1)
  const merchant=kind==='transfer'?(destination?.name||form.merchant).trim():(form.merchant||({income:'Income',purchase:'Expense',refund:'Refund'}[kind])).trim()
  const item={...old,id:old?.id||crypto.randomUUID(),initiatedDate:form.initiatedDate||old?.initiatedDate||'',incomeScheduleId:'',scheduledIncomeDate:'',...dateFields(form.date,now),kind,status:!form.historical&&form.status==='pending'?'pending':'cleared',importedExpense:Boolean(form.importedExpense),categoryReviewed:form.categoryReviewed===true,splits:validateSplits(form.splits,value),accountId:account.id,merchant,amount:value,category:kind==='income'?'Income':kind==='transfer'?'Transfer':form.category||'Other',subcategory:['purchase','refund'].includes(kind)?form.subcategory||'':'',historical:Boolean(form.historical),...(kind==='transfer'?{toAccountId:destination?.id||'',transferPurpose:form.transferPurpose}:{}),...(incomeSchedule?{incomeScheduleId:incomeSchedule.id,scheduledIncomeDate:form.scheduledIncomeDate}:{})}
  for(const refund of data.transactions.filter(t=>t.kind==='refund'&&t.originalTransactionId===item.id))allocateRefund({...data,transactions:data.transactions.map(t=>t.id===item.id?item:t)},{...refund,splits:refundReportingParts({...data,transactions:data.transactions.map(t=>t.id===item.id?item:t)},refund)},item)
  if(!item.historical&&item.status!=='pending')applyTransactionBalances(data,item)
  data.transactions=old?data.transactions.map(t=>t.id===old.id?item:t):[item,...data.transactions]
  return data
}
export function removeLedgerTransaction(source,id,now=new Date()) {
  const data=prepareData(source,now),old=data.transactions.find(t=>t.id===id)
  if(!old)throw new Error('Entry not found.')
  if(data.transactions.some(t=>t.kind==='refund'&&t.originalTransactionId===id))throw Error('Remove the linked refunds before removing their original expense. Their history must remain connected.')
  if(!old.historical&&old.status!=='pending')applyTransactionBalances(data,old,-1)
  data.transactions=data.transactions.filter(t=>t.id!==id)
  return data
}
export function removeRecurringPayment(source,id,now=new Date()) {
  const data=prepareData(source,now),p=data.billPayments.find(p=>p.id===id)
  if(!p)throw new Error('Entry not found.')
  if(!p.historical&&p.status!=='pending'){const a=data.accounts.find(a=>a.id===p.bankId);changeBalance(data,a.id,(a.type==='credit'?-1:1)*cents(p.amount))}
  data.billPayments=data.billPayments.filter(p=>p.id!==id)
  return data
}

export function netSpendingEntries(data) {
  return [...data.transactions.filter(t=>t.status!=='pending'&&(t.kind==='purchase'||t.kind==='refund')).flatMap(t=>expandSplits({...t,...(t.kind==='refund'?{splits:refundReportingParts(data,t)}:{}),amount:t.kind==='refund'?-Number(t.amount):Number(t.amount)}).map(categorizeSpendingEntry)),...data.billPayments.filter(p=>p.status!=='pending').map(p=>categorizeSpendingEntry({...p,merchant:p.billName,category:p.category||'Other',subcategory:p.subcategory||'',accountId:p.bankId,kind:'purchase'}))]
}
