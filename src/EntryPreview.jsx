import { entryPreview } from './lib/entryPreview.js'
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})
export default function EntryPreview({data,form,kind}){
  const preview=entryPreview(data,form,kind)
  if(!preview)return null
  return <section className="entry-preview" aria-label="Balance preview"><strong>What saving this entry will do</strong>{preview.changes.length?<ul>{preview.changes.map(a=><li key={a.id}>{a.name}: {money.format(a.before)} → {money.format(a.after)}<small> ({a.delta<0?'decreases':'increases'} by {money.format(Math.abs(a.delta))})</small></li>)}</ul>:<p>Your account balances stay the same. {form.status==='pending'?'Pending withdrawals reduce the working cash estimate, not the cleared balance. Mark cleared when your bank posts it.':'This entry is for history and reporting only.'}</p>}{preview.historical&&preview.changes.length>0&&<p>Editing an old entry reverses its previous balance effect before applying your corrected choice.</p>}<p>{kind==='payment'?(form.status==='pending'?'This will not mark a minimum met until it clears.':form.statementId?'Counts only toward your selected statement. It does not pay another month’s minimum.':'No statement is selected, so this will not mark any statement minimum met.'):'This is an app record. It does not move money at your bank.'}</p></section>
}
