import { cents, dollars, localDate, trackedObligations } from './finance.js'

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
  return {today,month,monthEnd,checking,savings,cardMinimums,cashBills,overdue,afterKnownDues,buffer,essentialsRemaining,potentialExtra,planned}
}

export function saveCashPlan(data,form,now=new Date()) {
  const valid=value=>value!==''&&value!=null&&Number.isFinite(Number(value))&&Number(value)>=0&&Math.abs(Number(value)*100-Math.round(Number(value)*100))<0.00001
  if(!valid(form.buffer)||!valid(form.essentialsRemaining))throw new Error('Enter nonnegative dollar amounts with at most two decimal places for both fields.')
  return {...data,cashPlan:{month:localDate(now).slice(0,7),buffer:dollars(cents(form.buffer)),essentialsRemaining:dollars(cents(form.essentialsRemaining))}}
}
