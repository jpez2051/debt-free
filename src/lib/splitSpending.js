import { cents, dollars } from './finance.js'
export function validateSplits(splits,total){
  if(splits===undefined||splits===null||Array.isArray(splits)&&splits.length===0)return []
  if(!Array.isArray(splits)||splits.length>20||splits.some(s=>!s.category||!Number.isFinite(Number(s.amount))||Number(s.amount)<=0||Math.abs(Number(s.amount)*100-cents(s.amount))>0.00001)||splits.reduce((sum,s)=>sum+cents(s.amount),0)!==cents(total))throw Error('Split categories must have positive dollar amounts and add up exactly to the transaction total.')
  return splits.map(s=>({category:s.category,subcategory:s.subcategory||'',amount:dollars(cents(s.amount))}))
}
export function expandSplits(entry){return entry.splits?.length?entry.splits.map((split,index)=>({...entry,...split,id:`${entry.id}-split-${index}`,parentId:entry.id,amount:entry.kind==='refund'?-Math.abs(Number(split.amount)):Number(split.amount)})):[entry]}
