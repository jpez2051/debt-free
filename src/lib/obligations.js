function validDay(value){return Math.min(31,Math.max(1,Number(value)||1))}
function monthDate(year,month,day){const last=new Date(year,month+1,0,12).getDate();return new Date(year,month,Math.min(validDay(day),last),12)}

export function upcomingDueDate(dueDay,now=new Date()){
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12)
  let due=monthDate(today.getFullYear(),today.getMonth(),dueDay)
  if(due<today)due=monthDate(today.getFullYear(),today.getMonth()+1,dueDay)
  return due
}

export function cardMinimumObligation(card,payments,now=new Date()){
  const required=Math.min(Math.max(0,Number(card.balance)||0),Math.max(0,Number(card.minimum)||0))
  if(!required)return null
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12),endOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59,999)
  const completed=payments.filter(p=>p.cardId===card.id&&p.cycleAdvanced&&p.cycleDueDateBefore).map(p=>({...p,completedDue:new Date(`${p.cycleDueDateBefore}T12:00:00`)})).filter(p=>!Number.isNaN(p.completedDue.getTime())&&p.completedDue>=today&&new Date(p.date)<=endOfToday).sort((a,b)=>b.completedDue-a.completedDue)[0]
  if(completed)return {id:`card-${card.id}`,kind:'card',name:`${card.name} minimum`,accountName:card.name,dueDate:completed.completedDue,required,paid:required,remaining:0}
  const savedDue=card.nextDueDate?new Date(`${card.nextDueDate}T12:00:00`):null
  const dueDate=savedDue&&!Number.isNaN(savedDue.getTime())?savedDue:upcomingDueDate(card.dueDay,now)
  const previousDue=monthDate(dueDate.getFullYear(),dueDate.getMonth()-1,card.dueDay||dueDate.getDate())
  const paid=Math.min(required,payments.filter(p=>p.cardId===card.id&&new Date(p.date)>previousDue&&new Date(p.date)<=endOfToday).reduce((sum,p)=>sum+Math.max(0,Number(p.amount)||0),0))
  return {id:`card-${card.id}`,kind:'card',name:`${card.name} minimum`,accountName:card.name,dueDate,required,paid,remaining:Math.max(0,required-paid)}
}

export function upcomingObligations({cards,bills,payments,accounts,now=new Date()}){
  const accountNames=Object.fromEntries(accounts.map(a=>[a.id,a.name]))
  const billItems=bills.filter(b=>b.active!==false).map(b=>({id:`bill-${b.id}`,kind:'bill',name:b.name,accountName:accountNames[b.accountId]||'Unassigned',dueDate:upcomingDueDate(b.dueDay,now),required:Math.max(0,Number(b.amount)||0),paid:0,remaining:Math.max(0,Number(b.amount)||0)}))
  const cardItems=cards.map(card=>cardMinimumObligation(card,payments,now)).filter(Boolean)
  return [...billItems,...cardItems].sort((a,b)=>a.dueDate-b.dueDate||a.name.localeCompare(b.name))
}
