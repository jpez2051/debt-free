import {recordDebtProgress} from './debtProgress.js'
import { cloudFingerprint } from './cloudSync.js'
import { cents, dollars } from './finance.js'
import { invalidateCheckpoints } from './checkpoints.js'
const collections=['transactions','payments','billPayments','accounts','bills','cardStatements','billCycles','adjustments','creditScores','incomeSchedules']
export function recordChange(before,after,label='Saved change',now=new Date()){
  after=invalidateCheckpoints(before,after)
  if(cloudFingerprint(before)===cloudFingerprint(after))return after
  after=recordDebtProgress(before,after,now,label)
  const balances=after.accounts.filter(a=>before.accounts.some(b=>b.id===a.id&&cents(b.balance)!==cents(a.balance))).map(a=>({accountId:a.id,before:Number(before.accounts.find(b=>b.id===a.id).balance),after:Number(a.balance),delta:dollars(cents(a.balance)-cents(before.accounts.find(b=>b.id===a.id).balance))}))
  const records=[]
  for(const collection of collections){const old=new Map((before[collection]||[]).map(x=>[x.id,x])),next=new Map((after[collection]||[]).map(x=>[x.id,x]));for(const id of new Set([...old.keys(),...next.keys()])){if(cloudFingerprint(old.get(id)||{})!==cloudFingerprint(next.get(id)||{})){const a=old.get(id),b=next.get(id),details=[];if(a?.amount!==undefined||b?.amount!==undefined)details.push(`Amount: ${a?.amount??'none'} → ${b?.amount??'none'}`);if(a?.localDate!==b?.localDate)details.push(`Date: ${a?.localDate||'none'} → ${b?.localDate||'none'}`);if(a?.status!==b?.status)details.push(`Status: ${a?.status||'cleared'} → ${b?.status||'removed'}`);records.push({collection,id,operation:!old.has(id)?'added':!next.has(id)?'removed':'edited',details})}}}
  if(!records.length&&cloudFingerprint({...before,changeHistory:[]})===cloudFingerprint({...after,changeHistory:[]}))return after
  if(label==='Saved change'){const adjustment=records.find(r=>r.collection==='adjustments'),record=adjustment||records[0];label=adjustment?'Reconciled account balance':record?`${record.operation[0].toUpperCase()+record.operation.slice(1)} ${record.collection==='transactions'?'activity entry':record.collection==='billPayments'?'bill payment':record.collection==='payments'?'card payment':record.collection==='cardStatements'?'card statement':record.collection}`:'Updated plan or settings'}
  return {...after,changeHistory:[...(before.changeHistory||[]),{id:crypto.randomUUID(),date:now.toISOString(),label,balances,records}]}
}
