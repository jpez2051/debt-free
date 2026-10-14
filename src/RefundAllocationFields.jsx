import { originalParts, remainingRefundParts } from './lib/refundAllocation.js'
export default function RefundAllocationFields({data,form,onChange}) {
 const original=data.transactions.find(t=>t.id===form.originalTransactionId)
 if(!original)return null
 let remaining,error
 try{remaining=remainingRefundParts(data,original,form.id)}catch(e){error=e.message;remaining=originalParts(original)}
 const edit=(part,value)=>{
  const parts=(form.splits||[]).filter(p=>!(p.category===part.category&&(p.subcategory||'')===(part.subcategory||'')))
  if(Number(value)>0)parts.push({...part,amount:value})
  onChange(parts)
 }
 return <details open={Boolean(form.splits?.length)||Boolean(error)}><summary>Allocate a partial refund to returned items</summary><p>Full refunds automatically reverse the original categories. For a partial refund, enter only the returned amounts below; together they must equal the refund.</p>{error&&<p role="alert">{error}</p>}{remaining.map(part=><label key={`${part.category}-${part.subcategory}`}>{part.subcategory||part.category} — up to ${Number(part.amount).toFixed(2)}<input type="number" min="0" max={part.amount} step=".01" value={form.splits?.find(p=>p.category===part.category&&(p.subcategory||'')===(part.subcategory||''))?.amount??''} onChange={e=>edit(part,e.target.value)}/></label>)}<button type="button" className="secondary" onClick={()=>onChange([])}>Use automatic allocation for full refund</button></details>
}
