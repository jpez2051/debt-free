import { useEffect,useState,useRef } from 'react'
import useDirtyForm from './useDirtyForm.js'
export function extraPaymentValue(value){
 if(value===''||!Number.isFinite(Number(value))||Number(value)<0||Math.abs(Number(value)*100-Math.round(Number(value)*100))>0.00001)throw Error('Enter a nonnegative amount with at most two decimal places.')
 return Math.round(Number(value)*100)/100
}
export default function PayoffExtraEditor({value,onSave}){
 const saving=useRef(false),[busy,setBusy]=useState(false)
 const [draft,setDraft]=useState(String(value)),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('')
 useDirtyForm(dirty)
 useEffect(()=>{if(!dirty)setDraft(String(value))},[value,dirty])
 const edit=v=>{setDraft(v);setDirty(true);setStatus('');setError('')}
 const apply=()=>{if(saving.current)return;try{const amount=extraPaymentValue(draft);saving.current=true;setBusy(true);if(onSave(amount)===false)throw Error('Could not save the plan. Check the save warning.');Promise.resolve(onSave.protection).then(()=>{setDirty(false);setStatus('Monthly extra saved.')}).catch(e=>setError(e.message)).finally(()=>{saving.current=false;setBusy(false)})}catch(e){saving.current=false;setBusy(false);setError(e.message)}}
 return <section className="payoff-extra-editor"><label className="field">Extra each month<div className="money-input"><span>$</span><input disabled={busy} type="number" inputMode="decimal" step=".01" min="0" value={draft} onChange={e=>edit(e.target.value)}/></div></label><div className="preset-row">{[50,100,250,500].map(v=><button type="button" disabled={busy} key={v} className="mini" onClick={()=>edit(String(v))}>Set ${v}</button>)}</div><p className="muted">Editing does not change your saved plan. Apply the amount when ready.</p><button type="button" className="primary" disabled={!dirty||busy} onClick={apply}>Apply monthly extra</button>{error&&<p role="alert">{error}</p>}{status&&<p role="status">{status}</p>}</section>
}
