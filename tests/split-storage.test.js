import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeWorkspace, decodeWorkspace, publishSplitWorkspace, PART_BYTES } from '../src/lib/splitStorage.js'
import { cloudFingerprint, CloudConflictError } from '../src/lib/cloudSync.js'

const fixture=()=>({accounts:[{id:'bank',name:'Checking',type:'checking',balance:100}],transactions:[{id:'tx',accountId:'bank',kind:'purchase',amount:3,merchant:'Store',date:'2026-10-09T12:00:00Z',historical:true}],payments:[],bills:[],extra:0,repairHistory:[{message:'Preserve nested metadata',copy:[{x:1}]}]})
function adapter(){let active={data:fixture(),version:'old'},fail=false,corrupt=false,conflict=false,commits=0;const parts=new Map();return {
  parts,get active(){return active},get commits(){return commits},set fail(v){fail=v},set corrupt(v){corrupt=v},set conflict(v){conflict=v},
  run:async data=>publishSplitWorkspace({data,current:structuredClone(active),expectedFingerprint:cloudFingerprint(active.storageFormat===2?await decodeWorkspace(active.manifest,async id=>parts.get(id)):active.data),readPart:async id=>corrupt?'bad':parts.get(id),writeParts:async incoming=>{if(fail)throw Error('Permission denied');for(const [id,json] of incoming)parts.set(id,json);if(conflict)active={data:{...fixture(),extra:50},version:'new'}},commit:async(next,expected)=>{if(cloudFingerprint(expected)!==cloudFingerprint(active))throw new CloudConflictError();active=next;commits++}})
}}
test('split storage round-trips relationships, balances, order and nested metadata exactly',async()=>{
  const data=fixture(),before=structuredClone(data),{manifest,parts}=await encodeWorkspace(data)
  assert.deepEqual(await decodeWorkspace(manifest,async id=>parts.get(id)),data);assert.deepEqual(data,before)
})
test('history larger than one document is divided into bounded parts',async()=>{
  const data=fixture();data.transactions=Array.from({length:9000},(_,i)=>({...data.transactions[0],id:`t${i}`,merchant:'A longer merchant name '.repeat(6)}))
  assert.ok(new TextEncoder().encode(JSON.stringify(data)).length>1_048_576)
  const {manifest,parts}=await encodeWorkspace(data);assert.ok(manifest.fields.transactions.parts.length>1)
  for(const json of parts.values())assert.ok(new TextEncoder().encode(json).length<=PART_BYTES)
  assert.deepEqual(await decodeWorkspace(manifest,async id=>parts.get(id)),data)
})
test('verified migration switches the index once; subsequent saves reuse unchanged parts',async()=>{
  const a=adapter(),data=fixture();await a.run(data);const count=a.parts.size
  assert.equal(a.active.storageFormat,2);assert.equal(a.commits,1)
  await a.run({...data,extra:50});assert.equal(a.parts.size,count+1);assert.ok(a.active.previousManifest)
})
test('permission failure or interrupted staging never changes the active workspace',async()=>{
  const a=adapter(),before=structuredClone(a.active);a.fail=true;await assert.rejects(a.run(fixture()),/Permission/)
  assert.deepEqual(a.active,before);assert.equal(a.commits,0)
})
test('a missing or damaged staged part fails verification before publication',async()=>{
  const a=adapter(),before=structuredClone(a.active);a.corrupt=true;await assert.rejects(a.run(fixture()),/missing or damaged/)
  assert.deepEqual(a.active,before);assert.equal(a.commits,0)
})
test('a concurrent device edit wins over a stale migration; no newer records are overwritten',async()=>{
  const a=adapter();a.conflict=true;await assert.rejects(a.run(fixture()),CloudConflictError)
  assert.equal(a.active.data.extra,50);assert.equal(a.commits,0)
})
test('oversized individual records and invalid workspaces fail before any writes',async()=>{
  const a=adapter(),data=fixture();data.transactions[0].merchant='x'.repeat(PART_BYTES+1)
  await assert.rejects(a.run(data),/too large/);assert.equal(a.parts.size,0)
  await assert.rejects(a.run({accounts:[]}),/validation/);assert.equal(a.parts.size,0)
})
