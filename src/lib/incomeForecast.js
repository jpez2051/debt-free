import { calendarDate, cents, dollars, localDate, trackedObligations, transactionDay } from './finance.js'

export const INCOME_FREQUENCIES = [
  ['weekly','Weekly'],
  ['biweekly','Every two weeks'],
  ['semimonthly','Twice a month'],
  ['monthly','Monthly'],
]

const atNoon = value => new Date(`${value}T12:00:00`)
const addDays = (value, days) => {
  const date=atNoon(value)
  date.setDate(date.getDate()+days)
  return localDate(date)
}
const monthDate = (year,month,day) => localDate(new Date(year,month,Math.min(day,new Date(year,month+1,0).getDate()),12))
const addMonths = (value,months,day=atNoon(value).getDate()) => {
  const date=atNoon(value)
  return monthDate(date.getFullYear(),date.getMonth()+months,day)
}

export function scheduleOccurrences(schedule,{from=new Date(),days=30}={}){
  if(schedule?.active===false||!calendarDate(schedule?.nextDate)||Number(schedule?.amount)<=0)return []
  const start=localDate(from),end=addDays(start,Math.max(0,Number(days)||0)),dates=[]
  if(schedule.frequency==='weekly'||schedule.frequency==='biweekly'){
    const step=schedule.frequency==='weekly'?7:14
    let date=schedule.nextDate
    for(let guard=0;date<start&&guard<10000;guard++)date=addDays(date,step)
    for(let guard=0;date<=end&&guard<10000;guard++,date=addDays(date,step))dates.push(date)
  }else if(schedule.frequency==='monthly'){
    const anchorDay=atNoon(schedule.nextDate).getDate()
    let date=schedule.nextDate
    for(let guard=0;date<start&&guard<1200;guard++)date=addMonths(date,1,anchorDay)
    for(let guard=0;date<=end&&guard<1200;guard++,date=addMonths(date,1,anchorDay))dates.push(date)
  }else if(schedule.frequency==='semimonthly'){
    const anchor=atNoon(schedule.nextDate),firstDay=anchor.getDate(),secondDay=Math.min(31,Math.max(1,Number(schedule.secondPayDay)||firstDay))
    const cursor=new Date(atNoon(start).getFullYear(),atNoon(start).getMonth()-1,1,12)
    for(let guard=0;guard<16;guard++){
      const year=cursor.getFullYear(),month=cursor.getMonth()
      for(const date of new Set([monthDate(year,month,firstDay),monthDate(year,month,secondDay)]))if(date>=schedule.nextDate&&date>=start&&date<=end)dates.push(date)
      cursor.setMonth(cursor.getMonth()+1)
    }
  }
  return [...new Set(dates)].sort().map(date=>({id:`${schedule.id}-${date}`,scheduleId:schedule.id,date,name:schedule.name,amount:dollars(cents(schedule.amount)),accountId:schedule.accountId}))
}

export function expectedIncomeOccurrences(data,now=new Date(),days=30){
  const recorded=new Set((data.transactions||[]).filter(t=>t.kind==='income'&&t.incomeScheduleId&&calendarDate(t.scheduledIncomeDate)).map(t=>`${t.incomeScheduleId}|${t.scheduledIncomeDate}`))
  return (data.incomeSchedules||[]).flatMap(schedule=>scheduleOccurrences(schedule,{from:now,days})).filter(item=>!recorded.has(`${item.scheduleId}|${item.date}`)).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name))
}

export function readyIncomeOccurrences(data,now=new Date()){
  const today=localDate(now),lookback=addDays(today,-40)
  const recorded=new Set((data.transactions||[]).filter(t=>t.kind==='income'&&t.incomeScheduleId&&calendarDate(t.scheduledIncomeDate)).map(t=>`${t.incomeScheduleId}|${t.scheduledIncomeDate}`))
  return (data.incomeSchedules||[]).map(schedule=>scheduleOccurrences(schedule,{from:atNoon(lookback),days:40}).filter(item=>item.date<=today).at(-1)).filter(item=>item&&!recorded.has(`${item.scheduleId}|${item.date}`)).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name))
}

export function nextOccurrenceForSchedule(schedule,transactions=[],now=new Date()){
  const data={incomeSchedules:[schedule],transactions}
  return readyIncomeOccurrences(data,now)[0]||expectedIncomeOccurrences(data,now,400)[0]||null
}

export function saveIncomeSchedule(source,form){
  if(!form.name?.trim()||!Number.isFinite(Number(form.amount))||cents(form.amount)<=0)throw new Error('Enter an income name and an expected amount greater than zero.')
  if(!calendarDate(form.nextDate))throw new Error('Choose a valid next expected deposit date.')
  if(!INCOME_FREQUENCIES.some(([value])=>value===form.frequency))throw new Error('Choose how often this income is expected.')
  const account=(source.accounts||[]).find(a=>a.id===form.accountId&&a.type!=='credit')
  if(!account)throw new Error('Choose a cash account for this deposit.')
  const secondPayDay=form.frequency==='semimonthly'?Number(form.secondPayDay):undefined
  if(form.frequency==='semimonthly'&&(!Number.isInteger(secondPayDay)||secondPayDay<1||secondPayDay>31))throw new Error('Choose the other payday as a day from 1 to 31.')
  const schedules=source.incomeSchedules||[],old=schedules.find(item=>item.id===form.id)
  const item={...old,id:old?.id||crypto.randomUUID(),name:form.name.trim(),amount:dollars(cents(form.amount)),accountId:account.id,frequency:form.frequency,nextDate:form.nextDate,active:form.active!==false,...(form.frequency==='semimonthly'?{secondPayDay}: {})}
  if(form.frequency!=='semimonthly')delete item.secondPayDay
  return {...source,incomeSchedules:old?schedules.map(value=>value.id===old.id?item:value):[...schedules,item]}
}

export function setIncomeScheduleActive(source,id,active){
  if(!(source.incomeSchedules||[]).some(item=>item.id===id))throw new Error('Expected income schedule not found.')
  return {...source,incomeSchedules:source.incomeSchedules.map(item=>item.id===id?{...item,active:Boolean(active)}:item)}
}

export function cashFlowForecast(data,now=new Date(),days=30){
  const today=localDate(now),end=addDays(today,days),cashCents=(data.accounts||[]).filter(a=>a.type!=='credit').reduce((total,a)=>total+cents(a.balance),0)
  const income=expectedIncomeOccurrences(data,now,days),nextIncome=income[0]||null
  const obligations=trackedObligations(data,now).filter(item=>item.remaining>0&&item.dateKey<=end&&(item.kind==='card'||item.fundingType!=='credit'))
  const beforeNext=nextIncome?obligations.filter(item=>item.dateKey<nextIncome.date):obligations
  const dueBeforeIncomeCents=beforeNext.reduce((total,item)=>total+cents(item.remaining),0)
  const obligationsCents=obligations.reduce((total,item)=>total+cents(item.remaining),0)
  const expectedIncomeCents=income.reduce((total,item)=>total+cents(item.amount),0)
  return {
    today,end,days,currentCash:dollars(cashCents),income,nextIncome,obligations,beforeNext,
    dueBeforeIncome:dollars(dueBeforeIncomeCents),coverageBeforeIncome:dollars(cashCents-dueBeforeIncomeCents),
    expectedIncome:dollars(expectedIncomeCents),obligationsDue:dollars(obligationsCents),
    projectedCash:dollars(cashCents+expectedIncomeCents-obligationsCents),
  }
}
