import { useEffect, useRef, useState } from 'react'
import { getCloudSession } from './lib/cloudState.js'
export default function DraftRecovery({kind,draft,onRestore,enabled=true}){
 const baseline=useRef(JSON.stringify(draft)),[saved,setSaved]=useState(null),[error,setError]=useState('')
 useEffect(()=>{let live=true;Promise.resolve(getCloudSession().actions?.drafts?.()||[]).then(list=>{if(live)setSaved(list.find(item=>item.kind===kind)||null)}).catch(()=>{if(live)setError('Unfinished drafts could not be read.')});return()=>{live=false}},[kind])
 useEffect(()=>{if(!enabled||JSON.stringify(draft)===baseline.current)return;const timer=setTimeout(()=>{Promise.resolve(getCloudSession().actions?.saveDraft?.({kind,data:draft})).catch(()=>setError('This unfinished form could not be protected. Keep the page open.'))},300);return()=>clearTimeout(timer)},[draft,kind,enabled])
 return <>{saved&&<section className="entry-preview"><strong>An unfinished {kind} form is saved on this device.</strong><p>This is not a recorded transaction. Restoring replaces the fields in this form.</p><button type="button" className="secondary" onClick={()=>{onRestore(saved.data);setSaved(null)}}>Restore unfinished form</button><button type="button" className="secondary" onClick={async()=>{try{await getCloudSession().actions?.removeDraft?.(kind);setSaved(null)}catch{setError('Could not remove the unfinished draft.')}}}>Discard saved draft</button></section>}{error&&<p role="alert">{error}</p>}</>
}
