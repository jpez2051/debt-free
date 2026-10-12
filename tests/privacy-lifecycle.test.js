import test from 'node:test'
import assert from 'node:assert/strict'
import { deletionIdentity, deletePrivateAccount, unusedParts } from '../functions/privacy-core.js'
import { recoveryStore } from '../src/lib/cloudRecovery.js'
const now=Date.UTC(2026,9,12),request={auth:{uid:'alice',token:{auth_time:now/1000}},data:{confirmation:'DELETE MY DEBT FREE ACCOUNT',uid:'bob'}}
test('account deletion only targets the authenticated user and requires recent explicit confirmation',()=>{
 assert.equal(deletionIdentity(request,now),'alice');assert.throws(()=>deletionIdentity({...request,auth:null},now),/Sign in/);assert.throws(()=>deletionIdentity({...request,data:{}},now),/confirmation/);assert.throws(()=>deletionIdentity(request,now+6*60000),/again/)
 assert.throws(()=>deletionIdentity({...request,data:{...request.data,expectedUid:'bob'}},now),/Sign-in changed/)
})
test('deletion barrier precedes recursive workspace deletion and auth removal; failures never unblock writes',async()=>{
 const calls=[],adapter=Object.fromEntries(['block','deleteWorkspace','deleteAuth','complete'].map(name=>[name,async uid=>calls.push(`${name}:${uid}`)]))
 assert.deepEqual(await deletePrivateAccount(request,adapter,now),{deleted:true});assert.deepEqual(calls,['block:alice','deleteWorkspace:alice','deleteAuth:alice','complete:alice'])
 calls.length=0;adapter.deleteWorkspace=async()=>{throw Error('Interrupted')};await assert.rejects(deletePrivateAccount(request,adapter,now),/Interrupted/);assert.deepEqual(calls,['block:alice'])
})
test('cloud cleanup retains active/previous, recent, and undated parts',()=>{
 const manifest=ids=>({fields:{records:{parts:ids}}}),record={manifest:manifest(['live']),previousManifest:manifest(['previous'])},old=now-31*86400000
 assert.deepEqual(unusedParts(record,[{id:'live',createdAt:old},{id:'previous',createdAt:old},{id:'old',createdAt:old},{id:'new',createdAt:now},{id:'undated'}],now),['old'])
})
test('device pruning never removes pending or another account and keeps the newest five',()=>{
 const map=new Map(),storage={get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},data={accounts:[],transactions:[],payments:[],bills:[]},alice=recoveryStore(storage,'alice'),bob=recoveryStore(storage,'bob')
 alice.write({data,baseFingerprint:'base'});bob.archive(data,'Bob')
 for(let i=0;i<8;i++){const key=alice.archive(data,`Copy ${i}`),record=JSON.parse(storage.getItem(key));record.updatedAt=new Date(now-(50-i)*86400000).toISOString();storage.setItem(key,JSON.stringify(record))}
 assert.equal(alice.prune({now:new Date(now)}),3);assert.equal(alice.list().length,5);assert.ok(alice.read());assert.equal(bob.list().length,1);assert.throws(()=>alice.removeArchive(bob.list()[0].key),/Only this account/)
})
