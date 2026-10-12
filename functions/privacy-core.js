// No arbitrary path or target user is accepted from the browser.
export function authenticatedUid(request){
  const uid=request.auth?.uid
  if(typeof uid!=='string'||!uid||uid.includes('/')||uid==='.'||uid==='..')throw Object.assign(Error('Sign in with a valid account before continuing.'),{code:'unauthenticated'})
  return uid
}
export function deletionIdentity(request,now=Date.now()){
  const uid=authenticatedUid(request),authTime=Number(request.auth?.token?.auth_time)*1000
  if(!uid)throw Object.assign(Error('Sign in before deleting your account.'),{code:'unauthenticated'})
  if(!Number.isFinite(authTime)||now-authTime>5*60*1000||authTime>now+60000)throw Object.assign(Error('Sign in again before permanent deletion.'),{code:'failed-precondition'})
  if(request.data?.confirmation!=='DELETE MY DEBT FREE ACCOUNT')throw Object.assign(Error('Permanent deletion confirmation is required.'),{code:'invalid-argument'})
  if(request.data?.expectedUid&&request.data.expectedUid!==uid)throw Object.assign(Error('Sign-in changed before deletion. Start again.'),{code:'failed-precondition'})
  return uid
}
export async function deletePrivateAccount(request,{block,deleteWorkspace,deleteAuth,complete},now=Date.now()){
  const uid=deletionIdentity(request,now)
  await block(uid) // Persistent write barrier survives retries and old authentication tokens.
  await deleteWorkspace(uid)
  await deleteAuth(uid)
  await complete(uid)
  return {deleted:true}
}
export function unusedParts(record,parts,now=Date.now()){
  for(const manifest of [record.manifest,record.previousManifest].filter(Boolean))if(!manifest.fields||typeof manifest.fields!=='object'||Object.values(manifest.fields).some(field=>!Array.isArray(field.parts)))throw Error('The workspace index needs review before cleanup.')
  if(!record.manifest)throw Error('No active workspace index exists. Cleanup stopped.')
  const live=new Set([record.manifest,record.previousManifest].filter(Boolean).flatMap(manifest=>Object.values(manifest.fields||{}).flatMap(field=>field.parts||[])))
  return parts.filter(part=>!live.has(part.id)&&Number.isFinite(part.createdAt)&&part.createdAt<now-30*86400000).map(part=>part.id)
}
