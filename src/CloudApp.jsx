import { useEffect, useMemo, useRef, useState } from 'react'
import { Cloud, LogIn, LogOut, Plus, ShieldCheck, Upload } from 'lucide-react'
import App from './App.jsx'
import CloudScreen from './CloudScreen.jsx'
import { prepareData } from './lib/finance.js'
import { loadState } from './lib/storage.js'
import { getActiveData, setActiveData, setCloudSession } from './lib/cloudState.js'
import { observeUser, readCloudData, signIn, signOutUser, watchCloudData, writeCloudData, migrateCloudStorage, cloudStorageFormat, privacyCapabilities, deleteCloudAccount, cleanupCloudStorage } from './lib/firebaseClient.js'
import { createCloudWorkspace, recoveryStore } from './lib/cloudRecovery.js'
import { persistentWorkspace } from './lib/persistentWorkspace.js'
import { hasDirtyForms } from './lib/formDrafts.js'
import { cloudFingerprint } from './lib/cloudSync.js'

const starter={accounts:[],transactions:[],payments:[],bills:[],billPayments:[],creditScores:[],strategy:'avalanche',extra:0}
export default function CloudApp(){
  const localData=useMemo(()=>loadState(starter),[])
  const hasLegacyRecords=['accounts','transactions','payments','bills','billPayments','creditScores','incomeSchedules'].some(key=>localData[key]?.length)
  const [phase,setPhase]=useState('checking'),[user,setUser]=useState(null),[cloudData,setCloudData]=useState(null),[message,setMessage]=useState(''),[workspaceVersion,setWorkspaceVersion]=useState(0)
  const device=useRef(null),controller=useRef(null),watcher=useRef(()=>{}),authGeneration=useRef(0),currentUser=useRef(null),saveState=useRef({status:'saved'})
  const actions=()=>({pendingCopy:()=>controller.current?.pendingData,signOut:logout,restore:restoreCloudData,reload:reloadCloudData,clear:clearCloudData,retry:retryPendingSave,compare:()=>controller.current.compare(),useCloud:useCloudCopy,useLocal:useLocalCopy,upgradeStorage:upgradeStorage,privacyCapabilities,deleteAccount,cleanupStorage:async()=>{assertClean();return cleanupCloudStorage()},removeRecovery,pruneRecoveries,recoveryStats:()=>deviceStore().stats(),recoveries:()=>deviceStore().list(),saveDraft:value=>deviceStore().saveDraft?.(value),drafts:()=>deviceStore().drafts?.()||[],removeDraft:kind=>deviceStore().removeDraft?.(kind)})
  function announce(){const signedIn=currentUser.current;if(!signedIn)return;const state=saveState.current;setCloudSession({status:'ready',user:signedIn,saveStatus:state.status,storageFormat:cloudStorageFormat(signedIn.uid),sync:state.error||({saved:'Saved in the cloud',saving:'Saving…',protecting:'Protecting changes on this device…',offline:'Using the last acknowledged device copy', 'protection-failed':'Device recovery failed — download a backup',recovered:'Unsaved changes recovered',conflict:'Cloud conflict — review recovery options',failed:'Cloud save failed — local recovery protected',remote:'Updated from another device'}[state.status]),actions:actions()})}
  function accept(data){const ready=prepareData(data||starter);setCloudData(ready);setActiveData(ready);setWorkspaceVersion(x=>x+1);window.dispatchEvent(new Event('debt-free-save-recovered'))}
  async function startWatching(signedIn,generation){
    watcher.current()
    const stop=await watchCloudData(signedIn.uid,async(remote,error)=>{
      if(generation!==authGeneration.current)return
      if(error){saveState.current={...saveState.current,error:'Cloud updates need attention'};announce();return}
      if(remote&&!controller.current?.hasPending()&&cloudFingerprint(remote)!==controller.current?.fingerprint){saveState.current={status:'remote-available',error:'New records are available from another device. Reload when you are ready; open forms are not changed.'};announce()}
    })
    if(generation!==authGeneration.current)stop();else watcher.current=stop
  }
  useEffect(()=>{
    const stop=observeUser(async signedIn=>{
      const generation=++authGeneration.current
      watcher.current();controller.current?.close();controller.current=null;currentUser.current=signedIn;setUser(signedIn);setCloudData(null);setActiveData(null);setMessage('')
      if(!signedIn){setPhase('signedOut');setCloudData(null);setActiveData(null);setCloudSession({status:'signedOut',user:null,sync:'',actions:{signIn:login}});return}
      setPhase('loading');setCloudSession({status:'loading',user:signedIn,sync:'Opening your private cloud record…',actions:{signOut:logout}})
      try{
        const stored=await persistentWorkspace(localStorage,signedIn.uid)
        if(generation!==authGeneration.current)return
        device.current=stored
        const workspace=createCloudWorkspace({uid:signedIn.uid,store:stored,readCloud:readCloudData,writeCloud:writeCloudData,onState:state=>{if(generation!==authGeneration.current)return;saveState.current=state;announce()}})
        controller.current=workspace
        const saved=await workspace.load()
        if(generation!==authGeneration.current)return
        if(saved){accept(saved);setPhase('ready');announce();startWatching(signedIn,generation)}
        else{setPhase('migration');setCloudSession({status:'migration',user:signedIn,sync:hasLegacyRecords?'Choose how to begin':'Ready for a new workspace',actions:{signOut:logout,importLocal:importLocalData,startFresh}})}
      }catch(error){if(generation!==authGeneration.current)return;setMessage(error.message||'Your cloud record could not be opened.');setPhase('error');setCloudSession({status:'error',user:signedIn,sync:'Cloud connection needs attention',actions:{signOut:logout}})}
    })
    return()=>{authGeneration.current++;stop();watcher.current();controller.current?.close()}
  },[])
  useEffect(()=>{const warn=e=>{if(!controller.current?.hasPending())return;e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[])
  useEffect(()=>{const online=()=>{if(!controller.current)return;if(controller.current.hasPending())retryPendingSave().catch(()=>{});else if(saveState.current.status==='offline'&&!hasDirtyForms())reloadCloudData().catch(()=>{})};window.addEventListener('online',online);return()=>window.removeEventListener('online',online)},[])
  async function login(){setMessage('');try{await signIn()}catch(e){setMessage(e.message||'Google sign-in could not be completed.')}}
  async function logout(){if(controller.current?.hasPending()&&!confirm('Unsaved changes are protected on this device for this Google account. Download a backup before using a different device. Sign out?'))return;try{await signOutUser()}catch(e){setMessage(e.message)}}
  async function create(data){const workspace=controller.current;await workspace.save(prepareData(data));if(workspace!==controller.current)return;accept(data);setPhase('ready');startWatching(currentUser.current,authGeneration.current)}
  async function importLocalData(){setMessage('');try{await create(localData)}catch(e){setMessage(e.message)}}
  async function startFresh(){setMessage('');try{await create(starter)}catch(e){setMessage(e.message)}}
  function assertClean(){if(controller.current?.hasPending())throw new Error('Review recovery options before replacing records. Your unsaved copy remains protected.')}
  async function restoreCloudData(data){assertClean();if(hasDirtyForms())throw Error('Close or save unfinished forms before restoring records.');await deviceStore().archive(getActiveData(),'Cloud copy before backup restore');const workspace=controller.current;await workspace.save(data);if(workspace===controller.current)accept(data)}
  async function reloadCloudData(){if(hasDirtyForms())throw Error('Save or discard unfinished forms before reloading cloud records.');if(controller.current?.hasPending())throw new Error('Use Review recovery options to keep this device’s copy and load the latest cloud.');const workspace=controller.current;const data=await workspace.load();if(workspace===controller.current){accept(data);setPhase('ready');startWatching(currentUser.current,authGeneration.current)}}
  async function clearCloudData(){assertClean();await restoreCloudData(prepareData(starter))}
  async function retryPendingSave(){const workspace=controller.current,snapshot=workspace.pendingData;await workspace.retry();if(workspace!==controller.current)return;if(snapshot&&cloudFingerprint(snapshot)!==cloudFingerprint(getActiveData())){if(hasDirtyForms()){saveState.current={status:'remote-available',error:'Recovered changes are saved. Close unfinished forms, then load the saved copy.'};announce()}else accept(snapshot)}window.dispatchEvent(new Event('debt-free-save-recovered'))}
  async function useCloudCopy(){if(hasDirtyForms())throw Error('Save or discard unfinished forms before replacing records.');const workspace=controller.current;const data=await workspace.useCloud();if(workspace===controller.current)accept(data)}
  async function useLocalCopy(){if(hasDirtyForms())throw Error('Save or discard unfinished forms before replacing records.');const workspace=controller.current;const data=await workspace.useLocal();if(workspace===controller.current)accept(data)}
  async function upgradeStorage(){assertClean();const signedIn=currentUser.current;await migrateCloudStorage(signedIn.uid,controller.current.fingerprint);announce();return true}
  const deviceStore=()=>{if(!device.current)throw Error('Device recovery is not ready.');return device.current}
  async function removeRecovery(key){await deviceStore().removeArchive(key)}
  function pruneRecoveries(){return deviceStore().prune()}
  async function deleteAccount(){assertClean();const uid=currentUser.current.uid,workspace=controller.current;const result=await deleteCloudAccount(uid);if(!result.deleted)throw Error('Deletion was not confirmed.');await deviceStore().purge();workspace?.close();if(currentUser.current?.uid===uid){watcher.current();await signOutUser()}return result}
  const persist=data=>{if(!controller.current)throw new Error('Sign in before saving.');return controller.current.save(data)}
  if(phase==='checking'||phase==='loading')return <CloudScreen><span className="kicker">DEBT FREE CLOUD</span><h1>Opening your private financial workspace…</h1><p>Checking your secure sign-in and cloud record.</p></CloudScreen>
  if(phase==='signedOut')return <CloudScreen><span className="kicker">DEBT FREE CLOUD</span><h1>Your records can follow you.</h1><p>Sign in with Google to use your private cloud workspace on this phone or computer.</p><button className="primary cloud-action" onClick={login}><LogIn size={17}/> Continue with Google</button>{message&&<p role="alert">{message}</p>}<small>Your account controls access. Backups and device recovery copies contain sensitive financial records.</small></CloudScreen>
  if(phase==='migration')return <CloudScreen><span className="kicker">WELCOME TO DEBT FREE</span><h1>{hasLegacyRecords?'Bring your records along, or start fresh.':'Start your private workspace.'}</h1><p>{hasLegacyRecords?'This browser has existing records. Copy them to this Google account or start a blank workspace.':'There aren’t any local Debt Free records in this browser. Start blank, then restore a backup later from Settings if needed.'}</p>{hasLegacyRecords&&<button className="primary cloud-action" onClick={importLocalData}><Upload size={17}/> Copy my records to the cloud</button>}<button className="secondary cloud-action" onClick={startFresh}><Plus size={17}/> Start with a blank workspace</button><button className="secondary cloud-action" onClick={logout}><LogOut size={17}/> Use a different Google account</button>{message&&<p role="alert">{message}</p>}<small><ShieldCheck size={14}/> Existing local records are not removed.</small></CloudScreen>
  if(phase==='error')return <CloudScreen><h1>We could not open your private record.</h1><p role="alert">{message}</p><button className="secondary" onClick={()=>reloadCloudData().catch(e=>setMessage(e.message))}>Try loading again</button><button className="secondary" onClick={logout}>Sign out</button></CloudScreen>
  return <App key={`${user?.uid}-${workspaceVersion}`} initialData={cloudData||starter} persist={persist}/>
}
