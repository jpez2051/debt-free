import { calendarDate, cents, dollars, localDate, trackedObligations } from './finance.js'
import { expectedIncomeOccurrences } from './incomeForecast.js'
import { decisionSafety } from './decisionSafety.js'

export function cashPosition(data, now=new Date()) {
  const today=localDate(now),month=today.slice(0,7),monthEnd=localDate(new Date(now.getFullYear(),now.getMonth()+1,0,12))
  const checking=dollars((data.accounts||[]).filter(a=>a.type==='checking').reduce((sum,a)=>sum+cents(a.balance),0))
  const savings=dollars((data.accounts||[]).filter(a=>a.type==='savings').reduce((sum,a)=>sum+cents(a.balance),0))
  const due=trackedObligations(data,now).filter(item=>item.remaining>0&&item.dateKey<=monthEnd)
  const checkingDue=due.filter(item=>item.kind==='card'||(item.fundingType!=='savings'&&item.fundingType!=='credit'))
  const cardMinimums=dollars(checkingDue.filter(item=>item.kind==='card').reduce((sum,item)=>sum+cents(item.remaining),0))
  const cashBills=dollars(checkingDue.filter(item=>item.kind==='bill').reduce((sum,item)=>sum+cents(item.remaining),0))
  const overdue=dollars(checkingDue.filter(item=>item.dateKey<today).reduce((sum,item)=>sum+cents(item.remaining),0))
  const afterKnownDues=dollars(cents(checking)-cents(cardMinimums)-cents(cashBills))
  const plan=data.cashPlan||{},validAmount=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0
  const planned=plan.month===month&&validAmount(plan.essentialsRemaining)&&validAmount(plan.buffer)
  const buffer=validAmount(plan.buffer)?dollars(cents(plan.buffer)):0
  const essentialsRemaining=planned?dollars(cents(plan.essentialsRemaining)):null
  const potentialExtra=planned?dollars(Math.max(0,cents(afterKnownDues)-cents(buffer)-cents(essentialsRemaining))):null
  const banks=data.accounts.filter(a=>a.type==='checking'),sourceId=banks.some(a=>a.id===plan.accountId)?plan.accountId:banks.length===1?banks[0].id:''
  const nextPayday=expectedIncomeOccurrences(data,now,90).find(item=>item.date>=today&&(sourceId?item.accountId===sourceId:banks.some(a=>a.id===item.accountId)))?.date
  const reserveMode=plan.reserveMode||'next-payday'
  const reserveEnd=reserveMode==='custom'&&calendarDate(plan.reserveEnd)&&plan.reserveEnd>=today?plan.reserveEnd:reserveMode==='month-end'?monthEnd:nextPayday||monthEnd
  const reserveItems=trackedObligations(data,now).filter(item=>item.remaining>0&&item.dateKey<=reserveEnd&&(item.kind==='card'||!['credit','savings'].includes(item.fundingType)))
  // Forecast-only bill months: never insert new cycles into the user's ledger.
  for(const bill of data.bills.filter(b=>b.active!==false&&data.accounts.find(a=>a.id===b.accountId)?.type==='checking')){
    const existing=(data.billCycles||[]).filter(c=>c.billId===bill.id).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)),anchor=existing.at(-1)?.dueDate||bill.nextDueDate
    if(!calendarDate(anchor))continue
    const cursor=new Date(`${anchor}T12:00:00`),day=Number(bill.dueDay)||cursor.getDate()
    for(let guard=0;guard<1200;guard++){
      cursor.setDate(1);cursor.setMonth(cursor.getMonth()+(bill.frequency==='annual'?12:1));cursor.setDate(Math.min(day,new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate()))
      const dateKey=localDate(cursor);if(dateKey>reserveEnd)break
      if(dateKey>=today&&!existing.some(c=>c.dueDate===dateKey))reserveItems.push({id:`forecast-${bill.id}-${dateKey}`,billId:bill.id,kind:'bill',dateKey,remaining:Number(bill.amount),estimated:true})
    }
  }
  const funding=plan.cardFunding||{},assigned=item=>item.kind==='bill'?data.bills.find(b=>b.id===item.billId)?.accountId:(funding[item.cardId]||(banks.length===1?banks[0].id:''))
  const unassigned=reserveItems.filter(item=>!banks.some(a=>a.id===assigned(item))).length
  const accountReserves=banks.map(bank=>{const due=dollars(reserveItems.filter(item=>assigned(item)===bank.id).reduce((sum,item)=>sum+cents(item.remaining),0));return {id:bank.id,name:bank.name,balance:Number(bank.balance),due,afterDues:dollars(cents(bank.balance)-cents(due))}})
  const safety=decisionSafety(data,{today,end:reserveEnd,unassigned,shortfall:accountReserves.some(a=>a.afterDues<0)})
  if(reserveItems.some(item=>item.estimated))safety.notes.push('Future recurring bill months use the schedule’s estimated amount; no invoice or payment record was created.')
  const reservePlanned=planned&&plan.reserveEnd===reserveEnd&&Boolean(sourceId)
  const source=accountReserves.find(a=>a.id===sourceId)
  const reserveExtra=reservePlanned&&safety.ready?dollars(Math.max(0,cents(source.afterDues)-cents(buffer)-cents(essentialsRemaining))):null
  return {today,month,monthEnd,checking,savings,cardMinimums,cashBills,overdue,afterKnownDues,buffer,essentialsRemaining,potentialExtra,planned,reserveEnd,reserveMode,nextPayday,sourceId,accountReserves,reserveItems,reservePlanned,reserveExtra,safety,unassigned}
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
