import { cloudFingerprint } from './cloudSync.js'
import { cents, dollars } from './finance.js'
const collections=['transactions','payments','billPayments','accounts','bills','cardStatements','billCycles','adjustments','creditScores','incomeSchedules']
export function recordChange(before,after,label='Saved change',now=new Date()){
  const balances=after.accounts.filter(a=>before.accounts.some(b=>b.id===a.id&&cents(b.balance)!==cents(a.balance))).map(a=>({accountId:a.id,before:Number(before.accounts.find(b=>b.id===a.id).balance),after:Number(a.balance),delta:dollars(cents(a.balance)-cents(before.accounts.find(b=>b.id===a.id).balance))}))
  const records=[]
  for(const collection of collections){const old=new Map((before[collection]||[]).map(x=>[x.id,x])),next=new Map((after[collection]||[]).map(x=>[x.id,x]));for(const id of new Set([...old.keys(),...next.keys()])){if(cloudFingerprint(old.get(id)||{})!==cloudFingerprint(next.get(id)||{}))records.push({collection,id,operation:!old.has(id)?'added':!next.has(id)?'removed':'edited'})}}
  if(!records.length&&cloudFingerprint({...before,changeHistory:[]})===cloudFingerprint({...after,changeHistory:[]}))return after
  return {...after,changeHistory:[...(before.changeHistory||[]),{id:crypto.randomUUID(),date:now.toISOString(),label,balances,records}]}
}
