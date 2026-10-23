import { openingBalanceConflicts,openingBalanceKey } from './lib/openingBalanceGuard.js'
export default function OpeningBalanceNotice({data,form,onChange}){
 const accounts=openingBalanceConflicts(data,form)
 if(!accounts.length)return null
 const key=openingBalanceKey(data,form)
 return <section className="entry-preview opening-balance-notice"><strong>This predates your opening balance</strong><p>{accounts.map(a=>`${a.name} (${a.openingDate})`).join(', ')}. An opening balance normally already includes earlier activity.</p><button type="button" className="secondary" onClick={()=>onChange({...form,historical:true,openingBalanceConfirmation:''})}>Already included — keep balances unchanged</button><label className="check-line"><input type="checkbox" checked={form.openingBalanceConfirmation===key} onChange={e=>onChange({...form,openingBalanceConfirmation:e.target.checked?key:''})}/> I checked: this was NOT included. Apply its balance effect now.</label></section>
}
