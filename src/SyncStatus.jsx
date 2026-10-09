import { useEffect, useState } from 'react'
import { getCloudSession } from './lib/cloudState.js'
import { AccessibleDialog } from './ReliabilityCenter.jsx'
import { BACKUP_SCHEMA, RELEASE_VERSION } from './release.js'
import './product.css'

export function downloadRecovery(data,label='recovery'){
  const blob=new Blob([JSON.stringify({schema:BACKUP_SCHEMA,app:'Debt Free',version:RELEASE_VERSION,exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`debt-free-${label}-${Date.now()}.json`;link.click();URL.revokeObjectURL(url)
}
const counts=data=>`${data?.accounts?.length||0} accounts · ${(data?.transactions?.length||0)+(data?.payments?.length||0)+(data?.billPayments?.length||0)} activity entries`
export default function SyncStatus(){
  const [,tick]=useState(0),[copies,setCopies]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[replace,setReplace]=useState(false)
  useEffect(()=>{const refresh=()=>tick(x=>x+1);window.addEventListener('debt-free-cloud-updated',refresh);return()=>window.removeEventListener('debt-free-cloud-updated',refresh)},[])
  const session=getCloudSession(),state=session.saveStatus||'saved'
  if(session.status!=='ready')return null
  const run=async fn=>{setBusy(true);setError('');try{await fn()}catch(e){setError(e.message)}finally{setBusy(false)}}
  const resolve=()=>run(async()=>{setReplace(false);setCopies(await session.actions.compare())})
  const labels={saved:'Saved in cloud',saving:'Saving — protected on this device',failed:'Not saved to cloud — protected on this device',conflict:'Another device changed your records',recovered:'Unsaved changes recovered on this device',remote:'Updated from another device','remote-available':'New records available from another device — open forms are unchanged'}
  return <><div className={`sync-status sync-${state}`} role="status"><span>{labels[state]||session.sync}</span>{state==='remote-available'&&<button type="button" className="secondary compact" disabled={busy} onClick={()=>run(session.actions.reload)}>Load newer cloud copy</button>}{['failed','recovered'].includes(state)&&<button type="button" className="secondary compact" disabled={busy} onClick={()=>run(session.actions.retry)}>Retry save</button>}{['conflict','failed','recovered'].includes(state)&&<button type="button" className="secondary compact" disabled={busy} onClick={resolve}>Review recovery options</button>}{error&&<span role="alert">{error}</span>}</div>
    {copies&&<AccessibleDialog title="Recover your records safely" onClose={()=>!busy&&setCopies(null)}><div className="recovery-options"><p>These are two complete copies, not automatically merged. Download both before replacing either. Balances shown here are recorded balances, not live bank balances.</p>{[['This device',copies.local],['Latest cloud',copies.remote]].map(([name,data])=><section key={name}><h3>{name}</h3><p>{counts(data)}</p><ul>{data?.accounts?.map(a=><li key={a.id}>{a.name}: {Number(a.balance).toLocaleString(undefined,{style:'currency',currency:'USD'})}</li>)}</ul>{data&&<button type="button" className="secondary" onClick={()=>downloadRecovery(data,name==='This device'?'device-recovery':'cloud-recovery')}>Download {name.toLowerCase()} copy</button>}</section>)}<button type="button" className="primary" disabled={busy} onClick={()=>run(async()=>{await session.actions.useCloud();setCopies(null)})}>Use latest cloud — keep this device’s copy for recovery</button>{copies.local&&<><label className="check-line"><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/> I understand that using this device’s complete copy replaces newer cloud edits; it does not merge them.</label><button type="button" className="secondary" disabled={busy||!replace} onClick={()=>run(async()=>{await session.actions.useLocal();setCopies(null)})}>Replace cloud with this device’s copy</button></>}{error&&<p role="alert">{error}</p>}</div></AccessibleDialog>}
  </>
}
