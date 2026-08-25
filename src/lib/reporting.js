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
  const date=new Date(item?.date)
  if(Number.isNaN(date.getTime()))return false
  const start=reportingStart(period,now)
  const end=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59,999)
  return (!start||date>=start)&&date<=end
}

export function filterByReportingPeriod(items,period,now=new Date()){
  return items.filter(item=>inReportingPeriod(item,period,now))
}
