import { validateData } from './backup.js'
import { cloudFingerprint, cloudSafeData } from './cloudSync.js'

const key=uid=>`debt-free-pending:${uid}`
export function recoveryStore(storage,uid){
  const writerId=crypto.randomUUID()
  const read=()=>{const raw=storage.getItem(key(uid));if(!raw)return null;const value=JSON.parse(raw);if(value.uid!==uid||value.schema!==1||!validateData(value.data)||typeof value.baseFingerprint!=='string')throw new Error('The saved recovery copy needs review. It has not been removed.');return value}
  const write=value=>{try{const prior=read();if(prior&&prior.writerId!==writerId&&cloudFingerprint(prior.data)!==cloudFingerprint(value.data))archive(prior.data,'Unsaved copy protected from another tab');storage.setItem(key(uid),JSON.stringify({schema:1,uid,writerId,updatedAt:new Date().toISOString(),...value}))}catch{throw new Error('This browser cannot protect an unsaved change. Free browser storage or download a backup before continuing. Nothing was submitted to the cloud.')}}
  const archive=(data,label)=>{const name=`debt-free-recovery:${uid}:${crypto.randomUUID()}`;storage.setItem(name,JSON.stringify({schema:1,uid,label,updatedAt:new Date().toISOString(),data:cloudSafeData(data)}));return name}
  return {read,write,archive,clear:expected=>{const current=read();if(!current||!expected||cloudFingerprint(current.data)===cloudFingerprint(expected))storage.removeItem(key(uid))},list:()=>Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(name=>name?.startsWith(`debt-free-recovery:${uid}:`)).map(name=>({key:name,...JSON.parse(storage.getItem(name))})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}
}

// One controller per signed-in user. Queued writes never consult a later user's ID.
export function createCloudWorkspace({uid,store,readCloud,writeCloud,onState=()=>{}}){
  let base='',pending=null,remote=null,queue=Promise.resolve(),saving=0,closed=false
  const emit=(status,error='')=>{if(!closed)onState({status,error,pending:pending?.data||null,saving:saving>0})}
  const clearSaved=snapshot=>{base=cloudFingerprint(snapshot);if(pending?.data===snapshot){store.clear(snapshot);pending=null}else if(pending){pending={...pending,baseFingerprint:base};store.write(pending)}}
  async function load(){
    pending=store.read()
    try{remote=await readCloud(uid)}catch(error){if(!pending)throw error;base=pending.baseFingerprint;emit('failed',`Could not reach cloud. Unsaved changes recovered: ${error.message}`);return pending.data}
    base=cloudFingerprint(remote||{})
    if(pending&&cloudFingerprint(pending.data)===base){store.clear(pending.data);pending=null}
    if(pending){base=pending.baseFingerprint;emit(cloudFingerprint(remote||{})===base?'recovered':'conflict');return pending.data}
    emit('saved');return remote
  }
  function save(data){
    if(closed)throw new Error('This workspace is no longer active.')
    if(!validateData(data))throw new Error('Records need a data-integrity review before saving.')
    const snapshot=cloudSafeData(data)
    const draft={data:snapshot,baseFingerprint:base};store.write(draft);pending=draft
    saving++;emit('saving')
    const task=queue.catch(()=>{}).then(async()=>{if(closed)throw new Error('Sign-in changed before this save. The recovery copy is protected.');await writeCloud(uid,snapshot,base);clearSaved(snapshot)})
    queue=task
    return task.then(()=>{saving--;emit(pending?'recovered':'saved')}).catch(error=>{saving--;emit(error.code==='cloud/conflict'?'conflict':'failed',error.message);throw error})
  }
  async function compare(){await queue.catch(()=>{});remote=await readCloud(uid);if(!remote)throw new Error('No cloud workspace was found. The local recovery copy is still protected.');return {local:pending?.data,remote}}
  async function useCloud(){
    const {local,remote:latest}=await compare()
    if(local)store.archive(local,'Unsaved copy kept before loading cloud')
    store.clear(local);pending=null;base=cloudFingerprint(latest);emit('saved');return latest
  }
  async function useLocal(){
    const {local,remote:latest}=await compare();if(!local)return latest
    store.archive(latest,'Cloud copy kept before explicit replacement')
    base=cloudFingerprint(latest);await save(local);return local
  }
  async function acceptRemote(data){
    if(closed||saving||pending)return false
    const changed=cloudFingerprint(data)!==base
    if(changed){remote=data;base=cloudFingerprint(data);emit('remote')}
    return changed
  }
  return {load,save,compare,useCloud,useLocal,acceptRemote,retry:()=>pending?save(pending.data):Promise.resolve(),hasPending:()=>Boolean(pending),close:()=>{closed=true},get fingerprint(){return base}}
}
