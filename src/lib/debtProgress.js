import {cardTotals} from './cardTotals.js'
import {localDate,transactionDay} from './finance.js'

export const DEBT_CHANGE_REASONS=['accounts-changed','balance-correction','activity-correction']
const cards=data=>data.accounts.filter(a=>a.type==='credit')
const moneyFields=entry=>JSON.stringify([entry.amount,entry.kind,entry.accountId,entry.toAccountId,entry.bankId,entry.cardId,entry.status||'cleared',Boolean(entry.historical),transactionDay(entry)])
const normalClear=(before,after)=>before.status==='pending'&&after.status!=='pending'&&!before.historical&&!after.historical&&['kind','accountId','toAccountId','bankId','cardId'].every(key=>before[key]===after[key])

export function startDebtProgress(data,now=new Date()){
 if(!cards(data).length)throw Error('Add a card before starting a debt comparison.')
 return {...data,debtProgress:{version:1,date:localDate(now),capturedAt:now.toISOString(),startingDebt:cardTotals(data.accounts).debt,reasons:[]}}
}

// Compare recorded balance snapshots, never reconstruct an assumed starting
// balance from incomplete history. Record changes only during an actual save.
export function recordDebtProgress(before,after,now=new Date(),label=''){
 if(label==='Undid latest change')return after
 if(after.debtProgress&&after.debtProgress!==before.debtProgress&&JSON.stringify(after.debtProgress)!==JSON.stringify(before.debtProgress))return after
 if(!before.debtProgress){
  if(!cards(after).length)return after
  const starting=cards(before).length?before:after
  const initialized=startDebtProgress(starting,now)
  return recordDebtProgress(initialized,{...after,debtProgress:initialized.debtProgress},now,label)
 }
 const progress=before.debtProgress,reasons=new Set(progress.reasons)
 const oldCards=cards(before),newCards=cards(after),oldIds=new Set(oldCards.map(a=>a.id)),newIds=new Set(newCards.map(a=>a.id))
 if(oldCards.some(a=>!newIds.has(a.id)&&Number(a.balance)>0)||newCards.some(a=>!oldIds.has(a.id)&&Number(a.balance)>0))reasons.add('accounts-changed')
 const debtChanged=cardTotals(before.accounts).debt!==cardTotals(after.accounts).debt
 if(debtChanged){
  const adjustmentIds=new Set((before.adjustments||[]).map(a=>a.id))
  if((after.adjustments||[]).some(a=>!adjustmentIds.has(a.id)&&(oldIds.has(a.accountId)||newIds.has(a.accountId))))reasons.add('balance-correction')
  let newActivity=false,correctedActivity=false
  for(const collection of ['transactions','payments','billPayments']){
   const old=new Map((before[collection]||[]).map(entry=>[entry.id,entry]))
   const next=new Map((after[collection]||[]).map(entry=>[entry.id,entry]))
   const relevant=entry=>entry&&[entry.accountId,entry.toAccountId,entry.cardId,entry.bankId].some(id=>oldIds.has(id)||newIds.has(id))
   for(const [id,entry]of next){
    if(!relevant(entry)&&!relevant(old.get(id)))continue
    if(!old.has(id)){newActivity=true;if(transactionDay(entry)<progress.date)correctedActivity=true}
    else if(moneyFields(entry)!==moneyFields(old.get(id))){if(normalClear(old.get(id),entry))newActivity=true;else correctedActivity=true}
   }
   if([...old].some(([id,entry])=>!next.has(id)&&relevant(entry)))correctedActivity=true
  }
  if(correctedActivity)reasons.add('activity-correction')
  if(!newActivity&&!correctedActivity&&oldIds.size===newIds.size&&[...oldIds].every(id=>newIds.has(id)))reasons.add('balance-correction')
 }
 return {...after,debtProgress:{...progress,reasons:[...reasons]}}
}

export function debtProgressSummary(data){
 const total=cardTotals(data.accounts),progress=data.debtProgress
 const delta=progress?Math.round((total.debt-progress.startingDebt)*100)/100:null
 return {...total,count:cards(data).length,date:progress?.date||'',delta,reasons:progress?.reasons||[],tone:!progress||progress.reasons.length||delta===0?'neutral':delta>0?'increase':'decrease'}
}
