import test from 'node:test'
import assert from 'node:assert/strict'
import { createCloudWorkspace, recoveryStore } from '../src/lib/cloudRecovery.js'
import { cloudFingerprint, CloudConflictError } from '../src/lib/cloudSync.js'

const data=balance=>({accounts:[{id:'bank',name:'Checking',type:'checking',balance}],transactions:[],payments:[],bills:[]})
function memory(){const map=new Map();return {get length(){return map.size},key:i=>[...map.keys()][i],getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)}}
function harness(storage=memory(),uid='alice'){
  let remote=data(100),fail=false;const states=[],writes=[]
  const store=recoveryStore(storage,uid)
  const workspace=createCloudWorkspace({uid,store,readCloud:async()=>structuredClone(remote),writeCloud:async(id,next,base)=>{writes.push(id);if(fail)throw new Error('Offline');if(cloudFingerprint(remote)!==base)throw new CloudConflictError();remote=structuredClone(next)},onState:s=>states.push(s)})
  return {workspace,store,storage,states,writes,get remote(){return remote},set remote(value){remote=value},set fail(value){fail=value}}
}
test('failed save survives reopening and remains isolated by Google account',async()=>{
  const h=harness();await h.workspace.load();h.fail=true;await assert.rejects(h.workspace.save(data(90)),/Offline/)
  const reopened=createCloudWorkspace({uid:'alice',store:recoveryStore(h.storage,'alice'),readCloud:async()=>h.remote,writeCloud:async()=>{}})
  assert.equal((await reopened.load()).accounts[0].balance,90)
  assert.equal(recoveryStore(h.storage,'bob').read(),null)
  assert.equal(h.remote.accounts[0].balance,100)
})
test('an offline reopen recovers the pending data without clearing it',async()=>{
  const storage=memory(),store=recoveryStore(storage,'alice');store.write({data:data(90),baseFingerprint:cloudFingerprint(data(100))})
  const states=[],workspace=createCloudWorkspace({uid:'alice',store,readCloud:async()=>{throw Error('Offline')},writeCloud:async()=>{},onState:s=>states.push(s)})
  assert.equal((await workspace.load()).accounts[0].balance,90);assert.ok(store.read());assert.equal(states.at(-1).status,'failed')
})
test('conflict recovery can load cloud while preserving the complete local copy',async()=>{
  const h=harness();await h.workspace.load();h.remote=data(120)
  await assert.rejects(h.workspace.save(data(90)),CloudConflictError)
  await assert.rejects(h.workspace.retry(),CloudConflictError)
  assert.equal((await h.workspace.useCloud()).accounts[0].balance,120)
  assert.equal(h.store.list()[0].data.accounts[0].balance,90)
  assert.equal(h.store.read(),null);assert.equal(h.remote.accounts[0].balance,120)
  await h.workspace.save(data(115));assert.equal(h.remote.accounts[0].balance,115)
})
test('explicit replacement rechecks latest cloud and archives the version it replaces',async()=>{
  const h=harness();await h.workspace.load();h.remote=data(120);await assert.rejects(h.workspace.save(data(90)))
  h.remote=data(130);await h.workspace.useLocal()
  assert.equal(h.remote.accounts[0].balance,90);assert.equal(h.store.list()[0].data.accounts[0].balance,130);assert.equal(h.store.read(),null)
})
test('successive saves use the acknowledged baseline and do not clear a newer draft',async()=>{
  const h=harness();await h.workspace.load();await Promise.all([h.workspace.save(data(90)),h.workspace.save(data(80))])
  assert.equal(h.remote.accounts[0].balance,80);assert.equal(h.store.read(),null);assert.equal(h.states.at(-1).status,'saved')
})
test('quota failure rejects before cloud writes or a pending state is accepted',async()=>{
  const storage=memory();storage.setItem=()=>{throw Error('QuotaExceeded')};const h=harness(storage);await h.workspace.load()
  assert.throws(()=>h.workspace.save(data(90)),/cannot protect/);assert.equal(h.writes.length,0);assert.equal(h.workspace.hasPending(),false)
})
test('a closed controller cannot submit queued changes under a different sign-in',async()=>{
  const h=harness();await h.workspace.load();const save=h.workspace.save(data(90));h.workspace.close()
  await assert.rejects(save,/Sign-in changed/);assert.equal(h.writes.length,0);assert.equal(h.store.read().data.accounts[0].balance,90)
})
test('tabs preserve competing drafts and an older acknowledgement cannot clear another draft',()=>{
  const storage=memory(),one=recoveryStore(storage,'alice'),two=recoveryStore(storage,'alice')
  one.write({data:data(90),baseFingerprint:'old'});two.write({data:data(80),baseFingerprint:'old'});one.clear(data(90))
  assert.equal(two.read().data.accounts[0].balance,80);assert.equal(two.list()[0].data.accounts[0].balance,90)
})
test('remote updates never replace a pending local copy',async()=>{
  const h=harness();await h.workspace.load();h.fail=true;await assert.rejects(h.workspace.save(data(90)))
  assert.equal(await h.workspace.acceptRemote(data(120)),false);assert.equal(h.store.read().data.accounts[0].balance,90)
})
test('a pending copy already committed before interruption is recognized without duplicate writing',async()=>{
  const h=harness();h.store.write({data:data(100),baseFingerprint:cloudFingerprint(data(110))});await h.workspace.load()
  assert.equal(h.store.read(),null);assert.equal(h.writes.length,0)
})
