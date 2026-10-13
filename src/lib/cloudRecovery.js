import { validateData } from './backup.js'
import { cloudFingerprint, cloudSafeData } from './cloudSync.js'

const key=uid=>`debt-free-pending:${uid}`
export function recoveryStore(storage,uid){
  const writerId=crypto.randomUUID()
  const read=()=>{const raw=storage.getItem(key(uid));if(!raw)return null;const value=JSON.parse(raw);if(value.uid!==uid||value.schema!==1||!validateData(value.data)||typeof value.baseFingerprint!=='string')throw new Error('The saved recovery copy needs review. It has not been removed.');return value}
  const write=value=>{try{const prior=read();if(prior&&prior.writerId!==writerId&&cloudFingerprint(prior.data)!==cloudFingerprint(value.data))archive(prior.data,'Unsaved copy protected from another tab');storage.setItem(key(uid),JSON.stringify({schema:1,uid,writerId,updatedAt:new Date().toISOString(),...value}))}catch{throw new Error('This browser cannot protect an unsaved change. Free browser storage or download a backup before continuing. Nothing was submitted to the cloud.')}}
  const archive=(data,label)=>{const name=`debt-free-recovery:${uid}:${crypto.randomUUID()}`;storage.setItem(name,JSON.stringify({schema:1,uid,label,updatedAt:new Date().toISOString(),data:cloudSafeData(data)}));return name}
  const names=()=>Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(name=>name?.startsWith(`debt-free-recovery:${uid}:`))
  const list=()=>names().map(name=>{try{return {key:name,...JSON.parse(storage.getItem(name))}}catch{return {key:name,label:'Unreadable recovery copy — retained',updatedAt:'',corrupt:true}}}).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))
  const removeArchive=name=>{if(!name?.startsWith(`debt-free-recovery:${uid}:`))throw Error('Only this account’s archived copies can be removed.');storage.removeItem(name)}
  const prune=({keep=5,days=30,now=new Date()}={})=>{if(!Number.isInteger(keep)||keep<1||!Number.isFinite(days)||days<1)throw Error('Keep at least one recovery copy and choose a positive retention period.');const copies=list(),cutoff=now.getTime()-days*86400000;let removed=0;for(const copy of copies.slice(keep))if(!copy.corrupt&&new Date(copy.updatedAt).getTime()<cutoff){removeArchive(copy.key);removed++}return removed}
  const purge=()=>{storage.removeItem(key(uid));for(const name of names())storage.removeItem(name)}
  return {read,write,archive,list,removeArchive,prune,purge,stats:()=>({copies:names().length,bytes:[key(uid),...names()].reduce((sum,name)=>sum+new TextEncoder().encode(storage.getItem(name)||'').length,0)}),clear:expected=>{const current=read();if(!current||!expected||cloudFingerprint(current.data)===cloudFingerprint(expected))storage.removeItem(key(uid))}}
}

// One controller per signed-in user. Queued writes never consult a later user's ID.
export function createCloudWorkspace({uid,store,readCloud,writeCloud,onState=()=>{}}){
  let base='',pending=null,remote=null,queue=Promise.resolve(),saving=0,closed=false
  const emit=(status,error='')=>{if(!closed)onState({status,error,pending:pending?.data||null,saving:saving>0})}
  const clearSaved=async snapshot=>{base=cloudFingerprint(snapshot);await store.cache?.(snapshot);if(pending?.data===snapshot){await store.clear(snapshot);pending=null}else if(pending){pending={...pending,baseFingerprint:base};await store.write(pending)}}
  async function load(){
    pending=await store.read()
    try{remote=await readCloud(uid)}catch(error){if(!pending){const cached=await store.cached?.();if(!cached?.data)throw error;base=cloudFingerprint(cached.data);emit('offline',`Offline copy last saved ${cached.updatedAt}`);return cached.data}base=pending.baseFingerprint;emit('failed',`Could not reach cloud. Unsaved changes recovered: ${error.message}`);return pending.data}
    base=cloudFingerprint(remote||{})
    if(pending&&cloudFingerprint(pending.data)===base){await store.clear(pending.data);pending=null}
    if(pending){base=pending.baseFingerprint;emit(cloudFingerprint(remote||{})===base?'recovered':'conflict');return pending.data}
    if(remote)await store.cache?.(remote);emit('saved');return remote
  }
  function save(data){
    if(closed)throw new Error('This workspace is no longer active.')
    if(!validateData(data))throw new Error('Records need a data-integrity review before saving.')
    const snapshot=cloudSafeData(data)
    const draft={data:snapshot,baseFingerprint:base};const protection=store.write(draft);let protectedCopy=false;const protectedWrite=Promise.resolve(protection).then(()=>{protectedCopy=true});protectedWrite.catch(()=>{});pending=draft
    saving++;emit('protecting')
    const task=queue.catch(()=>{}).then(async()=>{await protectedWrite;emit('saving');if(closed)throw new Error('Sign-in changed before this save. The recovery copy is protected.');await writeCloud(uid,snapshot,base);await clearSaved(snapshot)})
    queue=task
    const result=task.then(()=>{saving--;emit(pending?'recovered':'saved')}).catch(error=>{saving--;emit(!protectedCopy?'protection-failed':error.code==='cloud/conflict'?'conflict':'failed',error.message);throw error})
    result.protected=protectedWrite;return result
  }
  async function compare(){await queue.catch(()=>{});remote=await readCloud(uid);if(!remote)throw new Error('No cloud workspace was found. The local recovery copy is still protected.');return {local:pending?.data,remote}}
  async function useCloud(){
    const {local,remote:latest}=await compare()
    if(local)await store.archive(local,'Unsaved copy kept before loading cloud')
    await store.clear(local);await store.cache?.(latest);pending=null;base=cloudFingerprint(latest);emit('saved');return latest
  }
  async function useLocal(){
    const {local,remote:latest}=await compare();if(!local)return latest
    await store.archive(latest,'Cloud copy kept before explicit replacement')
    base=cloudFingerprint(latest);await save(local);return local
  }
  async function acceptRemote(data){
    if(closed||saving||pending)return false
    const changed=cloudFingerprint(data)!==base
    if(changed){remote=data;base=cloudFingerprint(data);emit('remote')}
    return changed
  }
  return {load,save,compare,useCloud,useLocal,acceptRemote,retry:()=>pending?save(pending.data):Promise.resolve(),hasPending:()=>Boolean(pending),close:()=>{closed=true},get pendingData(){return pending?.data||null},get fingerprint(){return base}}
}
