import { calendarDate, cents, dollars, dueInMonth, localDate, trackedObligations } from './finance.js'
import { billScheduleSegments } from './billSchedule.js'

// One read-only projection for all cash views. Saved invoices/payments win over
// schedule estimates; a later invoice must never hide an intervening month.
export function projectedObligations(data,now=new Date(),end=localDate(now)){
  if(!calendarDate(end))throw Error('Choose a valid forecast end date.')
  const today=localDate(now),monthStart=today.slice(0,7)+'-01',items=trackedObligations(data,now).filter(item=>item.dateKey<=end)
  for(const bill of data.bills.filter(b=>b.active!==false)){
    const cycles=(data.billCycles||[]).filter(c=>c.billId===bill.id),account=data.accounts.find(a=>a.id===bill.accountId)
    for(const segment of billScheduleSegments(bill,cycles)){
    const anchor=segment.anchorDate
    const start=new Date(`${today}T12:00:00`),anchorDate=new Date(`${anchor}T12:00:00`),annual=segment.frequency==='annual'
    for(let guard=0;guard<1200;guard++){
      const month=annual?anchorDate.getMonth():start.getMonth(),year=start.getFullYear()
      const dateKey=dueInMonth(year,month,segment.dueDay||anchorDate.getDate())
      if(dateKey>end)break
      if(dateKey>=monthStart&&dateKey>=anchor&&dateKey>=segment.effectiveDate&&(!segment.until||dateKey<segment.until)&&(!bill.cancelFrom||dateKey<bill.cancelFrom)&&!cycles.some(c=>c.dueDate===dateKey||!annual&&c.dueDate>=segment.effectiveDate&&(!segment.until||c.dueDate<segment.until)&&c.dueDate.slice(0,7)===dateKey.slice(0,7))){
        items.push({id:`estimated-${bill.id}-${dateKey}`,billId:bill.id,kind:'bill',name:bill.name,dateKey,dueDate:new Date(`${dateKey}T12:00:00`),fundingType:account?.type||'unassigned',accountName:account?.name||'Unassigned',estimated:true,required:Number(segment.amount),paid:0,actualPaid:0,remaining:Number(segment.amount)})
      }
      if(annual)start.setFullYear(year+1);else{start.setDate(1);start.setMonth(start.getMonth()+1)}
    }
  }
  }
  return items.filter(item=>{const bill=item.kind==='bill'?data.bills.find(b=>b.id===item.billId):null;return !bill?.cancelFrom||item.dateKey<bill.cancelFrom||Number(item.actualPaid)>0||item.actualAmount!=null}).sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.id.localeCompare(b.id))
}
export const checkingObligations=(data,now,end)=>projectedObligations(data,now,end).filter(item=>item.remaining>0&&(item.kind==='card'||!['credit','savings'].includes(item.fundingType))).map(item=>{const pending=(item.kind==='card'?data.payments:data.billPayments).filter(p=>p.status==='pending'&&!p.historical&&(item.kind==='card'?p.statementId===item.statementId:p.cycleId===item.cycleId)).reduce((sum,p)=>sum+cents(p.amount),0);return {...item,pendingBankIds:(item.kind==='card'?data.payments:data.billPayments).filter(p=>p.status==='pending'&&!p.historical&&(item.kind==='card'?p.statementId===item.statementId:p.cycleId===item.cycleId)).map(p=>p.bankId),unpaidRemaining:item.remaining,pendingCovered:dollars(pending),remaining:dollars(Math.max(0,cents(item.remaining)-pending))}})
export function obligationTotal(items){return dollars(items.reduce((sum,item)=>sum+cents(item.remaining),0))}
