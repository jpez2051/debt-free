import { calendarDate } from './finance.js'

export function validateData(data) {
  if(!data||typeof data!=='object'||!['accounts','transactions','payments','bills'].every(k=>Array.isArray(data[k])))return false
  if(data.financeVersion!==undefined&&data.financeVersion!==1)return false
  const keys=['accounts','transactions','payments','bills','billPayments','creditScores','cardStatements','billCycles','adjustments','incomeSchedules']
  for(const key of keys){
    if(data[key]!==undefined&&!Array.isArray(data[key]))return false
    const ids=new Set()
    for(const item of data[key]||[]){if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))return false;ids.add(item.id)}
  }
  const number=x=>typeof x!=='boolean'&&x!==null&&x!==''&&Number.isFinite(Number(x))
  const amount=x=>number(x)&&Number(x)>=0
  const date=x=>typeof x==='string'&&!Number.isNaN(new Date(x).getTime())
  for(const key of ['transactions','payments','billPayments'])if((data[key]||[]).some(item=>item.status!==undefined&&!['pending','cleared'].includes(item.status)))return false
  if(data.accounts.some(a=>a.openingDate&&!calendarDate(a.openingDate)||a.openingBalance!==undefined&&!number(a.openingBalance)))return false
  if(data.transactions.some(t=>t.splits!==undefined&&(!Array.isArray(t.splits)||t.splits.length>20||t.splits.some(s=>!s||typeof s.category!=='string'||!s.category||!amount(s.amount)||Number(s.amount)<=0)||t.splits.length&&Math.round(Number(t.amount)*100)!==t.splits.reduce((sum,s)=>sum+Math.round(Number(s.amount)*100),0))))return false
  if((data.billCycles||[]).some(c=>c.status!==undefined&&!['normal','skipped','waived'].includes(c.status)))return false
  if(data.bills.some(b=>['recurrenceAnchorDate','scheduleEffectiveDate'].some(key=>b[key]!==undefined&&!calendarDate(b[key]))||b.scheduleHistory!==undefined&&(!Array.isArray(b.scheduleHistory)||b.scheduleHistory.some(s=>!s||!calendarDate(s.anchorDate)||!calendarDate(s.effectiveDate)||!calendarDate(s.until)||s.until<=s.effectiveDate||!['monthly','annual'].includes(s.frequency)||!Number.isInteger(s.dueDay)||s.dueDay<1||s.dueDay>31||!amount(s.amount)))))return false
  if(data.bills.some(b=>b.cancelFrom&&!calendarDate(b.cancelFrom)))return false
  const account=id=>data.accounts.find(a=>a.id===id),bill=id=>data.bills.find(b=>b.id===id),incomeSchedule=id=>(data.incomeSchedules||[]).find(item=>item.id===id)
  if(data.accounts.some(a=>!a.name||!number(a.balance)||(a.type!==undefined&&!['checking','savings','credit'].includes(a.type))||(a.accent!==undefined&&!/^#[0-9a-f]{6}$/i.test(a.accent))||['minimum','apr','limit'].some(k=>a[k]!==undefined&&!amount(a[k]))))return false
  if(data.transactions.some(t=>!account(t.accountId)||!amount(t.amount)||!date(t.date)||(t.kind!==undefined&&!['income','purchase','transfer','refund'].includes(t.kind))||(t.subcategory!==undefined&&typeof t.subcategory!=='string')||(t.toAccountId!==undefined&&t.toAccountId!==''&&(!account(t.toAccountId)||t.kind!=='transfer'||account(t.toAccountId).type==='credit'||t.toAccountId===t.accountId))||(t.transferPurpose!==undefined&&!['Savings contribution','Investment contribution','Account transfer','Other transfer'].includes(t.transferPurpose))))return false
  if(data.transactions.some(t=>t.originalTransactionId&&!data.transactions.some(original=>original.id===t.originalTransactionId&&original.kind==='purchase'&&original.accountId===t.accountId)))return false
  if(data.transactions.some(t=>t.incomeScheduleId&&(!incomeSchedule(t.incomeScheduleId)||t.kind!=='income'||!calendarDate(t.scheduledIncomeDate))))return false
  if(data.payments.some(p=>!account(p.bankId)||!account(p.cardId)||!amount(p.amount)||!date(p.date)||(account(p.bankId)?.type==='credit')||(account(p.cardId)?.type&&account(p.cardId).type!=='credit')))return false
  if(data.bills.some(b=>!b.name||!amount(b.amount)||(b.accountId&&!account(b.accountId))||(b.frequency&&!['monthly','annual'].includes(b.frequency))||(b.subcategory!==undefined&&typeof b.subcategory!=='string')))return false
  if((data.billPayments||[]).some(p=>!account(p.bankId)||!bill(p.billId)||!amount(p.amount)||!date(p.date)||(p.subcategory!==undefined&&typeof p.subcategory!=='string')))return false
  if((data.creditScores||[]).some(s=>!amount(s.score)||Number(s.score)<250||Number(s.score)>900||!date(s.date)))return false
  if((data.cardStatements||[]).some(s=>!account(s.cardId)||account(s.cardId).type!=='credit'||!calendarDate(s.dueDate)||!amount(s.minimum)))return false
  if((data.cardStatements||[]).some(s=>s.closingDate!==undefined&&s.closingDate!==''&&(!calendarDate(s.closingDate)||s.closingDate>=s.dueDate)))return false
  if((data.cardStatements||[]).some(s=>s.verification!==undefined&&!['issuer-confirmed','estimated','unverified'].includes(s.verification)))return false
  if((data.cardStatements||[]).some(s=>s.supersededBy&&!(data.cardStatements||[]).some(t=>t.id===s.supersededBy&&t.cardId===s.cardId&&t.dueDate>s.dueDate)))return false
  if((data.billCycles||[]).some(c=>!bill(c.billId)||!calendarDate(c.dueDate)||!amount(c.expectedAmount)||(c.actualAmount!=null&&!amount(c.actualAmount))))return false
  if(new Set((data.billCycles||[]).map(c=>`${c.billId}|${c.dueDate}`)).size!==(data.billCycles||[]).length)return false
  if(data.payments.some(p=>p.statementId&&!(data.cardStatements||[]).some(s=>s.id===p.statementId&&s.cardId===p.cardId)))return false
  if(data.payments.some(p=>p.assignmentStatus!==undefined&&(!['confirmed','unassigned','general','extra'].includes(p.assignmentStatus)||(p.assignmentStatus==='confirmed'&&!p.statementId)||(p.assignmentStatus!=='confirmed'&&Boolean(p.statementId)))))return false
  if((data.billPayments||[]).some(p=>p.cycleId&&!(data.billCycles||[]).some(c=>c.id===p.cycleId&&c.billId===p.billId)))return false
  if((data.adjustments||[]).some(a=>!account(a.accountId)||!number(a.before)||!number(a.after)||!number(a.delta)||!date(a.date)||!a.reason))return false
  if((data.incomeSchedules||[]).some(item=>!item.name||!account(item.accountId)||account(item.accountId).type==='credit'||!amount(item.amount)||Number(item.amount)<=0||!calendarDate(item.nextDate)||!['weekly','biweekly','semimonthly','monthly'].includes(item.frequency)||(item.frequency==='semimonthly'&&(!Number.isInteger(Number(item.secondPayDay))||Number(item.secondPayDay)<1||Number(item.secondPayDay)>31))))return false
  if(data.extra!==undefined&&!amount(data.extra))return false
  if(data.rollFreedMinimums!==undefined&&typeof data.rollFreedMinimums!=='boolean')return false
  if(data.cashPlan!==undefined&&(!data.cashPlan||typeof data.cashPlan!=='object'||!calendarDate(`${data.cashPlan.month}-01`)||!amount(data.cashPlan.buffer)||!amount(data.cashPlan.essentialsRemaining)))return false
  if(data.cashPlan?.reserveMode!==undefined&&(!['next-payday','month-end','custom'].includes(data.cashPlan.reserveMode)||!calendarDate(data.cashPlan.reserveEnd)||!account(data.cashPlan.accountId)||account(data.cashPlan.accountId).type!=='checking'||!data.cashPlan.cardFunding||Object.entries(data.cashPlan.cardFunding).some(([cardId,bankId])=>account(cardId)?.type!=='credit'||account(bankId)?.type!=='checking')))return false
  if(data.dataHealthAcknowledgements!==undefined&&(!Array.isArray(data.dataHealthAcknowledgements)||data.dataHealthAcknowledgements.some(x=>typeof x!=='string'||!x)||new Set(data.dataHealthAcknowledgements).size!==data.dataHealthAcknowledgements.length))return false
  if(data.completedMonths!==undefined&&(!Array.isArray(data.completedMonths)||data.completedMonths.some(x=>typeof x!=='string'||!calendarDate(`${x}-01`))||new Set(data.completedMonths).size!==data.completedMonths.length))return false
  if(data.repairHistory!==undefined&&!Array.isArray(data.repairHistory))return false
  if(data.changeHistory!==undefined&&(!Array.isArray(data.changeHistory)||data.changeHistory.some(e=>!e.id||!date(e.date)||typeof e.label!=='string'||!Array.isArray(e.balances)||e.balances.some(b=>!number(b.before)||!number(b.after)||!number(b.delta))||!Array.isArray(e.records))))return false
  return true
}
