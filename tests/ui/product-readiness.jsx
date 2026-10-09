// Synthetic UI-only cloud adapter. No Firebase or real user records are accessed.
import React,{useState} from 'react'
import { createRoot } from 'react-dom/client'
import App from '../../src/App.jsx'
import AdaptiveNav from '../../src/AdaptiveNav.jsx'
import SettingsCenter from '../../src/SettingsCenter.jsx'
import { prepareData,localDate } from '../../src/lib/finance.js'
import { createCloudWorkspace,recoveryStore } from '../../src/lib/cloudRecovery.js'
import { cloudFingerprint,CloudConflictError } from '../../src/lib/cloudSync.js'
import { setCloudSession,setActiveData } from '../../src/lib/cloudState.js'
import '../../src/styles.css'

const values=new Map(),storage={get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
const today=localDate(),fixture=prepareData({accounts:[{id:'bank',name:'Test Checking',type:'checking',balance:1000},{id:'card',name:'Test Card',type:'credit',balance:5000,minimum:50,apr:20,nextDueDate:today}],transactions:[],payments:[],bills:[],extra:0})
let remote=fixture,offline=false
const store=recoveryStore(storage,'synthetic-qa')
document.documentElement.dataset.debtMode=new URLSearchParams(location.search).get('theme')||'dark'
function TestProduct(){
  const [data,setData]=useState(fixture),[generation,setGeneration]=useState(0)
  const apply=data=>{setActiveData(data);setData(data);setGeneration(x=>x+1)}
  const [workspace]=useState(()=>createCloudWorkspace({uid:'synthetic-qa',store,readCloud:async()=>{if(offline)throw Error('Test cloud disconnected');return remote},writeCloud:async(uid,data,base)=>{if(offline)throw Error('Test cloud disconnected');if(cloudFingerprint(remote)!==base)throw new CloudConflictError();remote=structuredClone(data)},onState:state=>setCloudSession({status:'ready',user:{uid:'synthetic-qa',displayName:'Synthetic test account'},saveStatus:state.status,sync:state.error||state.status,storageFormat:1,actions:{retry:()=>workspace.retry(),compare:()=>workspace.compare(),useCloud:async()=>apply(await workspace.useCloud()),useLocal:async()=>apply(await workspace.useLocal()),reload:async()=>apply(await workspace.load()),restore:async value=>{await workspace.save(value);apply(value)},recoveries:()=>store.list(),upgradeStorage:async()=>{throw Error('Synthetic test — no Firebase setup is touched')}}})}))
  React.useEffect(()=>{workspace.load();const recovered=()=>{if(!workspace.hasPending())window.dispatchEvent(new Event('debt-free-save-recovered'))};window.addEventListener('debt-free-cloud-updated',recovered);return()=>window.removeEventListener('debt-free-cloud-updated',recovered)},[])
  return <><div className="sync-status" style={{margin:8}}><span>Synthetic test controls</span><button onClick={()=>{offline=!offline}}>Toggle test connection</button><button onClick={()=>{remote={...remote,accounts:remote.accounts.map(a=>a.id==='bank'?{...a,balance:a.balance+25}:a)}}}>Other device adds $25</button></div><App key={generation} initialData={data} persist={next=>workspace.save(next)}/><SettingsCenter/><AdaptiveNav/></>
}
createRoot(document.getElementById('root')).render(<TestProduct/> )
