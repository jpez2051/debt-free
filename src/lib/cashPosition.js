import { calendarDate, cents, dollars, localDate, trackedObligations } from './finance.js'
import { expectedIncomeOccurrences } from './incomeForecast.js'
import { decisionSafety } from './decisionSafety.js'
import { checkingObligations } from './obligationProjection.js'
import { accountBalances } from './accountBalances.js'

export function cashPosition(data, now=new Date()) {
  const today=localDate(now),month=today.slice(0,7),monthEnd=localDate(new Date(now.getFullYear(),now.getMonth()+1,0,12))
  const checking=dollars((data.accounts||[]).filter(a=>a.type==='checking').reduce((sum,a)=>sum+cents(a.balance),0))
  const savings=dollars((data.accounts||[]).filter(a=>a.type==='savings').reduce((sum,a)=>sum+cents(a.balance),0))
  const due=checkingObligations(data,now,monthEnd)
  const checkingDue=due.filter(item=>item.kind==='card'||(item.fundingType!=='savings'&&item.fundingType!=='credit'))
  const cardMinimums=dollars(checkingDue.filter(item=>item.kind==='card').reduce((sum,item)=>sum+cents(item.remaining),0))
  const cashBills=dollars(checkingDue.filter(item=>item.kind==='bill').reduce((sum,item)=>sum+cents(item.remaining),0))
  const overdue=dollars(checkingDue.filter(item=>item.dateKey<today).reduce((sum,item)=>sum+cents(item.remaining),0))
  const pendingOut=dollars(data.accounts.filter(a=>a.type==='checking').reduce((sum,a)=>sum+cents(accountBalances(data,a.id).pendingOut),0))
  const afterKnownDues=dollars(cents(checking)-cents(pendingOut)-cents(cardMinimums)-cents(cashBills))
  const plan=data.cashPlan||{},validAmount=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0
  const planned=plan.month===month&&validAmount(plan.essentialsRemaining)&&validAmount(plan.buffer)
  const buffer=validAmount(plan.buffer)?dollars(cents(plan.buffer)):0
  const essentialsRemaining=planned?dollars(cents(plan.essentialsRemaining)):null
  const potentialExtra=planned?dollars(Math.max(0,cents(afterKnownDues)-cents(buffer)-cents(essentialsRemaining))):null
  const banks=data.accounts.filter(a=>a.type==='checking'),sourceId=banks.some(a=>a.id===plan.accountId)?plan.accountId:banks.length===1?banks[0].id:''
  const nextPayday=expectedIncomeOccurrences(data,now,90).find(item=>item.date>=today&&(sourceId?item.accountId===sourceId:banks.some(a=>a.id===item.accountId)))?.date
  const reserveMode=plan.reserveMode||'next-payday'
  const reserveEnd=reserveMode==='custom'&&calendarDate(plan.reserveEnd)&&plan.reserveEnd>=today?plan.reserveEnd:reserveMode==='month-end'?monthEnd:nextPayday||monthEnd
  const reserveItems=checkingObligations(data,now,reserveEnd)
  const funding=plan.cardFunding||{},assigned=item=>item.kind==='bill'?data.bills.find(b=>b.id===item.billId)?.accountId:(funding[item.cardId]||(banks.length===1?banks[0].id:''))
  const unassigned=reserveItems.filter(item=>!banks.some(a=>a.id===assigned(item))).length
  const accountReserves=banks.map(bank=>{const due=dollars(reserveItems.filter(item=>assigned(item)===bank.id).reduce((sum,item)=>sum+cents(item.remaining),0)),balances=accountBalances(data,bank.id);return {id:bank.id,name:bank.name,balance:Number(bank.balance),pendingOut:balances.pendingOut,due,afterDues:dollars(cents(balances.working)-cents(due))}})
  const relevantIds=new Set([sourceId,...reserveItems.map(assigned),...reserveItems.flatMap(item=>item.pendingBankIds||[])].filter(Boolean))
  const safety=decisionSafety(data,{today,end:reserveEnd,unassigned,shortfall:accountReserves.some(a=>relevantIds.has(a.id)&&a.afterDues<0),relevantIds:[...relevantIds]})
  if(reserveItems.some(item=>item.estimated))safety.notes.push('Future recurring bill months use the schedule’s estimated amount; no invoice or payment record was created.')
  const reservePlanned=planned&&plan.reserveEnd===reserveEnd&&Boolean(sourceId)
  const source=accountReserves.find(a=>a.id===sourceId)
  const reserveExtra=reservePlanned&&safety.ready?dollars(Math.max(0,cents(source.afterDues)-cents(buffer)-cents(essentialsRemaining))):null
  return {today,month,monthEnd,checking,savings,pendingOut,cardMinimums,cashBills,overdue,afterKnownDues,buffer,essentialsRemaining,potentialExtra,planned,reserveEnd,reserveMode,nextPayday,sourceId,accountReserves,reserveItems,reservePlanned,reserveExtra,safety,unassigned}
}

export function saveCashPlan(data,form,now=new Date()) {
  const valid=value=>value!==''&&value!=null&&Number.isFinite(Number(value))&&Number(value)>=0&&Math.abs(Number(value)*100-Math.round(Number(value)*100))<0.00001
  if(!valid(form.buffer)||!valid(form.essentialsRemaining))throw new Error('Enter nonnegative dollar amounts with at most two decimal places for both fields.')
  const plan={month:localDate(now).slice(0,7),buffer:dollars(cents(form.buffer)),essentialsRemaining:dollars(cents(form.essentialsRemaining))}
  if(form.reserveMode!==undefined){
    if(!['next-payday','month-end','custom'].includes(form.reserveMode)||!calendarDate(form.reserveEnd)||form.reserveEnd<localDate(now))throw new Error('Choose a valid future reserve date.')
    if(!data.accounts.some(a=>a.id===form.accountId&&a.type==='checking'))throw new Error('Choose the checking account you would pay extra from.')
    const cardFunding=form.cardFunding||{}
    if(Object.entries(cardFunding).some(([cardId,bankId])=>!data.accounts.some(a=>a.id===cardId&&a.type==='credit')||!data.accounts.some(a=>a.id===bankId&&a.type==='checking')))throw new Error('Choose valid checking sources for card minimums.')
    Object.assign(plan,{reserveMode:form.reserveMode,reserveEnd:form.reserveEnd,accountId:form.accountId,cardFunding,reviewedAt:new Date().toISOString()})
  }
  return {...data,cashPlan:plan}
}
