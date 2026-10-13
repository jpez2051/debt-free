import { calendarDate, cycleTotals, prepareData } from './finance.js'
export function setBillException(source,id,status,reason,now=new Date()){
  if(!['normal','skipped','waived'].includes(status)||status!=='normal'&&!reason?.trim())throw Error('Choose a status and explain this bill-month exception.')
  const data=prepareData(source,now),target=typeof id==='object'?id:{id};let cycle=data.billCycles.find(c=>c.id===target.id)
  if(!cycle&&calendarDate(target.dueDate)){const bill=data.bills.find(b=>b.id===target.billId);if(bill){cycle={id:`cycle-${bill.id}-${target.dueDate}`,billId:bill.id,dueDate:target.dueDate,expectedAmount:bill.amount,actualAmount:null,needsReview:false};data.billCycles.push(cycle)}}
  if(!cycle)throw Error('Choose an existing bill month.')
  if(status!=='normal'&&data.billPayments.some(p=>p.cycleId===cycle.id&&p.status==='pending'))throw Error('Clear or remove the pending payment before marking this month skipped or waived.')
  if(status==='skipped'&&cycleTotals(cycle,data.billPayments,now).actualPaid>0)throw Error('This month has payments. Waive only the remainder, or correct the payments first.')
  cycle.status=status;cycle.exceptionReason=status==='normal'?'':reason.trim();cycle.needsReview=false
  return data
}
