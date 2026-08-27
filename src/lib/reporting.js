export const REPORTING_PERIODS=[
  {id:'month',label:'This month'},
  {id:'30days',label:'Last 30 days'},
  {id:'all',label:'All time'},
]

export function reportingStart(period,now=new Date()){
  if(period==='all')return null
  if(period==='30days'){const start=new Date(now);start.setDate(start.getDate()-29);start.setHours(0,0,0,0);return start}
  return new Date(now.getFullYear(),now.getMonth(),1,0,0,0,0)
}

export function inReportingPeriod(item,period,now=new Date()){
  const date=new Date(item?.localDate?`${item.localDate}T12:00:00`:item?.date)
  if(Number.isNaN(date.getTime()))return false
  const start=reportingStart(period,now)
  const end=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59,999)
  return (!start||date>=start)&&date<=end
}

export function filterByReportingPeriod(items,period,now=new Date()){
  return items.filter(item=>inReportingPeriod(item,period,now))
}

export function monthlyTrend(items,months=6,now=new Date()){
  const endOfToday=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59,999)
  return Array.from({length:months},(_,index)=>{const offset=months-1-index,date=new Date(now.getFullYear(),now.getMonth()-offset,1,12),year=date.getFullYear(),month=date.getMonth(),total=items.filter(item=>{const d=new Date(item.localDate?`${item.localDate}T12:00:00`:item.date);return !Number.isNaN(d.getTime())&&d<=endOfToday&&d.getFullYear()===year&&d.getMonth()===month}).reduce((sum,item)=>sum+Math.round((Number(item.amount)||0)*100),0)/100;return {id:`${year}-${String(month+1).padStart(2,'0')}`,label:date.toLocaleDateString('en-US',{month:'short'}),total}})
}

export function trendComparison(items,now=new Date()){
  const priorMonth=new Date(now.getFullYear(),now.getMonth()-1,1,12),cutoff=Math.min(now.getDate(),new Date(now.getFullYear(),now.getMonth(),0).getDate()),comparable=items.filter(item=>{const d=new Date(item.localDate?`${item.localDate}T12:00:00`:item.date);return d.getFullYear()!==priorMonth.getFullYear()||d.getMonth()!==priorMonth.getMonth()||d.getDate()<=cutoff}),months=monthlyTrend(comparable,2,now),previous=months[0].total,current=months[1].total,change=Math.round((current-previous)*100)/100,percent=previous>0?change/previous*100:null
  return {previous,current,change,percent}
}
