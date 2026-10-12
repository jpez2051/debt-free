import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { deletePrivateAccount, authenticatedUid, unusedParts } from './privacy-core.js'
import { randomUUID } from 'node:crypto'
initializeApp()
const db=getFirestore(),options={region:'us-west1',maxInstances:2,timeoutSeconds:540,memory:'512MiB'}
async function requireSetup(){const config=await db.doc('configuration/privacy').get();if(config.data()?.rulesVersion!=='privacy-v1')throw new HttpsError('failed-precondition','The project owner must publish the privacy rules and enable the backend first.')}
export const privacyCapabilities=onCall(options,async request=>{if(!request.auth)throw new HttpsError('unauthenticated','Sign in first.');try{await requireSetup();return {accountDeletion:true,cleanup:true}}catch{return {accountDeletion:false,cleanup:false}}})
export const deleteDebtFreeAccount=onCall(options,async request=>{
  await requireSetup()
  try{return await deletePrivateAccount(request,{
    block:uid=>db.doc(`privacyDeletion/${uid}`).set({state:'deleting',requestedAt:FieldValue.serverTimestamp()},{merge:true}),
    deleteWorkspace:uid=>db.recursiveDelete(db.doc(`users/${uid}`)),
    deleteAuth:async uid=>{try{await getAuth().deleteUser(uid)}catch(error){if(error.code!=='auth/user-not-found')throw error}},
    complete:uid=>db.doc(`privacyDeletion/${uid}`).set({state:'complete',completedAt:FieldValue.serverTimestamp()},{merge:true}),
  })}catch(error){throw new HttpsError(['unauthenticated','failed-precondition','invalid-argument'].includes(error.code)?error.code:'internal',error.code?'Sign in again or check your deletion confirmation.':'Deletion did not finish. Cloud writes stay blocked; contact the project owner to complete deletion.')}
})
export const cleanupDebtFreeStorage=onCall(options,async request=>{
  await requireSetup()
  let uid;try{uid=authenticatedUid(request)}catch{throw new HttpsError('unauthenticated','Sign in first.')}
  if(request.data?.confirmation!=='REMOVE UNUSED CLOUD PARTS')throw new HttpsError('invalid-argument','Confirm cloud cleanup.')
  const ref=db.doc(`users/${uid}`),epoch=randomUUID()
  let original
  await db.runTransaction(async transaction=>{const snapshot=await transaction.get(ref);original=snapshot.data();if(!original||original.storageFormat!==2)throw new HttpsError('failed-precondition','Upgrade to split storage first.');if(original.maintenance|| (await transaction.get(db.doc(`privacyDeletion/${uid}`))).exists)throw new HttpsError('failed-precondition','Workspace maintenance is already in progress.');transaction.update(ref,{maintenance:epoch,maintenanceEpoch:epoch})})
  try{
    const parts=await ref.collection('records').get(),ids=unusedParts(original,parts.docs.map(doc=>({id:doc.id,createdAt:doc.data().createdAt?.toMillis?.()})))
    for(let i=0;i<ids.length;i+=100){const batch=db.batch();for(const id of ids.slice(i,i+100))batch.delete(ref.collection('records').doc(id));await batch.commit()}
    return {removed:ids.length}
  }finally{await db.runTransaction(async transaction=>{const current=await transaction.get(ref);if(current.data()?.maintenance===epoch)transaction.update(ref,{maintenance:FieldValue.delete(),maintenanceEpoch:epoch})})}
})
