import { cloudSafeData, cloudFingerprint, CloudConflictError } from './cloudSync.js'
import { validateData } from './backup.js'

const bytes=text=>new TextEncoder().encode(text)
export const PART_BYTES=180_000
export async function contentId(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(text))),x=>x.toString(16).padStart(2,'0')).join('')}
export async function encodeWorkspace(data,limit=PART_BYTES){
  const clean=cloudSafeData(data),parts=new Map(),fields={}
  async function part(value){const json=JSON.stringify(value);if(bytes(json).length>limit)throw new Error('One record is too large for safe cloud storage. Download a backup and review that record.');const id=await contentId(json);parts.set(id,json);return id}
  for(const [key,value] of Object.entries(clean)){
    if(!Array.isArray(value)){fields[key]={kind:'value',parts:[await part(value)]};continue}
    const ids=[];let group=[],size=2
    for(const item of value){const itemSize=bytes(JSON.stringify(item)).length+1;if(size+itemSize>limit&&group.length){ids.push(await part(group));group=[];size=2}group.push(item);size+=itemSize}
    if(group.length||!ids.length)ids.push(await part(group))
    fields[key]={kind:'array',parts:ids}
  }
  const manifest={format:2,fields}
  if(bytes(JSON.stringify(manifest)).length>180_000)throw new Error('The workspace index is too large. Nothing was switched. Download a backup.')
  return {manifest,parts}
}
export async function decodeWorkspace(manifest,readPart){
  if(manifest?.format!==2||!manifest.fields||typeof manifest.fields!=='object')throw new Error('Cloud workspace index is invalid. Nothing was replaced.')
  const data={},cache=new Map()
  for(const [key,field] of Object.entries(manifest.fields)){
    if(['__proto__','constructor','prototype'].includes(key)||!['value','array'].includes(field.kind)||!Array.isArray(field.parts)||!field.parts.length||field.parts.some(id=>! /^[0-9a-f]{64}$/.test(id)))throw new Error('Cloud workspace index needs review.')
    const values=[]
    for(const id of field.parts){if(!cache.has(id)){const json=await readPart(id);if(typeof json!=='string'||await contentId(json)!==id)throw new Error('A cloud record is missing or damaged. Keep your backup; nothing was replaced.');cache.set(id,JSON.parse(json))}values.push(cache.get(id))}
    if(field.kind==='array'){if(values.some(value=>!Array.isArray(value)))throw new Error('A cloud record has the wrong format.');data[key]=values.flat()}
    else{if(values.length!==1)throw new Error('A cloud setting has the wrong format.');data[key]=values[0]}
  }
  if(!validateData(data))throw new Error('The reconstructed cloud record failed validation. Nothing was replaced.')
  return data
}

// Stage immutable parts, read them back, then switch only the small index atomically.
// A failed or conflicting switch leaves the previous complete workspace readable.
export async function publishSplitWorkspace({data,current,expectedFingerprint,readPart,writeParts,commit}){
  if(!validateData(data))throw new Error('Records failed validation before storage migration.')
  const existing=current?.storageFormat===2?await decodeWorkspace(current.manifest,readPart):current?.data||null
  if(expectedFingerprint&&cloudFingerprint(existing||{})!==expectedFingerprint)throw new CloudConflictError()
  const {manifest,parts}=await encodeWorkspace(data)
  const known=new Set(Object.values(current?.manifest?.fields||{}).flatMap(field=>field.parts))
  await writeParts(new Map([...parts].filter(([id])=>!known.has(id))))
  const verified=await decodeWorkspace(manifest,readPart)
  if(cloudFingerprint(verified)!==cloudFingerprint(data))throw new Error('Migration verification failed. The old cloud copy remains active.')
  const revision=await contentId(JSON.stringify(manifest))
  await commit({storageFormat:2,manifest,revision,previousManifest:current?.manifest||null},current)
  return verified
}
