import test from 'node:test'
import assert from 'node:assert/strict'
import { stageCloudParts } from '../src/lib/stageCloudParts.js'
test('existing v0.12 json-only rules remain writable and timestamp fallback is verified',async()=>{
 const records=new Map(),writes=[]
 await stageCloudParts(new Map([['one','[1]']]),{read:async id=>records.get(id),createdAt:()=>123,write:async parts=>{writes.push(parts);if([...parts.values()].some(value=>value.createdAt))throw Object.assign(Error('Old rules'),{code:'permission-denied'});for(const [id,value] of parts)records.set(id,value)}})
 assert.equal(writes.length,2);assert.deepEqual(records.get('one'),{json:'[1]'})
})
test('immutable existing parts are reused and corrupt values are never overwritten',async()=>{
 const records=new Map([['one',{json:'[1]',createdAt:123}]]),adapter={read:async id=>records.get(id),createdAt:()=>456,write:async()=>{throw Error('Should not write')}}
 await stageCloudParts(new Map([['one','[1]']]),adapter);await assert.rejects(stageCloudParts(new Map([['one','[2]']]),adapter),/verification/);assert.equal(records.get('one').json,'[1]')
})
test('network errors are not downgraded to legacy writes',async()=>{
 let writes=0;await assert.rejects(stageCloudParts(new Map([['one','[1]']]),{read:async()=>null,createdAt:()=>123,write:async()=>{writes++;throw Error('Offline')}}),/Offline/);assert.equal(writes,1)
})
