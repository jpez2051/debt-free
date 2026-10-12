import { RELEASE_VERSION } from '../release.js'
import { cloudFingerprint, cloudSafeData, CloudConflictError } from './cloudSync.js'
import { validateData } from './backup.js'
import { decodeWorkspace, publishSplitWorkspace } from './splitStorage.js'
import { stageCloudParts } from './stageCloudParts.js'

// Firebase web configuration identifies this public app; Firestore rules protect the private records.
const firebaseConfig = {
  apiKey: 'AIzaSyDJS6zB-BKc-8y_sdGRJx0V7a77sy0otxg',
  authDomain: 'debt-free-af527.firebaseapp.com',
  projectId: 'debt-free-af527',
  storageBucket: 'debt-free-af527.firebasestorage.app',
  messagingSenderId: '987101243699',
  appId: '1:987101243699:web:d3ba61769184d158f47646',
}

let services
const formats=new Map()
export const cloudStorageFormat=uid=>formats.get(uid)||1
async function getServices() {
  if (services) return services
  const [appSdk, authSdk, firestoreSdk] = await Promise.all([
    import('firebase/app'), import('firebase/auth'), import('firebase/firestore'),
  ])
  const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig)
  const auth = authSdk.getAuth(app)
  const database = firestoreSdk.getFirestore(app)
  const provider = new authSdk.GoogleAuthProvider()
  provider.setCustomParameters({ prompt:'select_account' })
  services = { auth, database, provider, authSdk, firestoreSdk }
  return services
}

export function observeUser(callback) {
  let unsubscribe = () => {}
  getServices().then(({ auth, authSdk }) => { unsubscribe = authSdk.onAuthStateChanged(auth, callback) }).catch(error => callback(null, error))
  return () => unsubscribe()
}
export async function signIn() {
  const { auth, provider, authSdk } = await getServices()
  try { return await authSdk.signInWithPopup(auth, provider) }
  catch (error) {
    if (error?.code === 'auth/popup-blocked') return authSdk.signInWithRedirect(auth, provider)
    throw error
  }
}
export async function signOutUser() { const { auth, authSdk } = await getServices(); return authSdk.signOut(auth) }
export async function privacyCapabilities(){const {database}=await getServices();const sdk=await import('firebase/functions');try{const result=await sdk.httpsCallable(sdk.getFunctions(database.app,'us-west1'),'privacyCapabilities')({});return result.data}catch{return {accountDeletion:false,cleanup:false}}}
export async function deleteCloudAccount(expectedUid){const {auth,provider,authSdk,database}=await getServices();if(!auth.currentUser||auth.currentUser.uid!==expectedUid)throw Error('Sign-in changed. Start deletion again.');await authSdk.reauthenticateWithPopup(auth.currentUser,provider);const sdk=await import('firebase/functions');if(auth.currentUser?.uid!==expectedUid)throw Error('Sign-in changed. Nothing was submitted for deletion.');return (await sdk.httpsCallable(sdk.getFunctions(database.app,'us-west1'),'deleteDebtFreeAccount')({confirmation:'DELETE MY DEBT FREE ACCOUNT',expectedUid})).data}
export async function cleanupCloudStorage(){const {database}=await getServices(),sdk=await import('firebase/functions');return (await sdk.httpsCallable(sdk.getFunctions(database.app,'us-west1'),'cleanupDebtFreeStorage')({confirmation:'REMOVE UNUSED CLOUD PARTS'})).data}

export async function readCloudData(uid) {
  const { database, firestoreSdk } = await getServices()
  const snapshot = await firestoreSdk.getDoc(firestoreSdk.doc(database, 'users', uid))
  return snapshot.exists() ? decodeCloud(uid,snapshot.data()) : null
}

async function readPart(uid,id){const {database,firestoreSdk:sdk}=await getServices();const part=await sdk.getDocFromServer(sdk.doc(database,'users',uid,'records',id));return part.exists()?part.data().json:null}
async function decodeCloud(uid,record){formats.set(uid,record.storageFormat||1);return record.storageFormat===2?decodeWorkspace(record.manifest,id=>readPart(uid,id)):record.data||null}
async function writeSplit(uid,data,current,expectedFingerprint){
  const {database,firestoreSdk:sdk}=await getServices(),reference=sdk.doc(database,'users',uid)
  return publishSplitWorkspace({data,current,expectedFingerprint,readPart:id=>readPart(uid,id),writeParts:async parts=>{
    await stageCloudParts(parts,{read:async id=>{const snapshot=await sdk.getDocFromServer(sdk.doc(database,'users',uid,'records',id));return snapshot.exists()?snapshot.data():null},createdAt:()=>sdk.serverTimestamp(),write:async records=>{const batch=sdk.writeBatch(database);for(const [id,value] of records)batch.set(sdk.doc(database,'users',uid,'records',id),value);await batch.commit()}})
  },commit:async(next,expected)=>sdk.runTransaction(database,async transaction=>{
    const latest=await transaction.get(reference),value=latest.exists()?latest.data():null
    if(cloudFingerprint(value||{})!==cloudFingerprint(expected||{}))throw new CloudConflictError()
    transaction.set(reference,{...next,version:RELEASE_VERSION,updatedAt:sdk.serverTimestamp()})
  })})
}
export async function migrateCloudStorage(uid,expectedFingerprint){
  const {database,firestoreSdk:sdk}=await getServices(),snapshot=await sdk.getDocFromServer(sdk.doc(database,'users',uid))
  if(!snapshot.exists())throw new Error('No cloud workspace was found.')
  const current=snapshot.data();if(current.storageFormat===2)return
  try{await sdk.getDocFromServer(sdk.doc(database,'users',uid,'records','setup-check'))}catch(error){if(error.code==='permission-denied')throw new Error('Storage upgrade is not enabled yet. Publish the updated firestore.rules in Firebase first. Your current cloud records have not changed.');throw error}
  await writeSplit(uid,current.data,current,expectedFingerprint);formats.set(uid,2)
}

export async function writeCloudData(uid, data, expectedFingerprint) {
  if(!validateData(data))throw new Error('Cloud save stopped: records need a data-integrity repair. Download a backup and review Data Health before making more changes.')
  const { database, firestoreSdk } = await getServices()
  const reference=firestoreSdk.doc(database, 'users', uid)
  const saved=await firestoreSdk.getDocFromServer(reference)
  if(saved.data()?.maintenance)throw Error('Cloud storage cleanup is in progress. Your device recovery is protected; retry when cleanup finishes.')
  if(saved.exists()&&saved.data().storageFormat===2){await writeSplit(uid,data,saved.data(),expectedFingerprint);formats.set(uid,2);return}
  await firestoreSdk.runTransaction(database, async transaction => {
    const current=await transaction.get(reference)
    if(current.exists()&&current.data().storageFormat===2)throw new CloudConflictError()
    if (expectedFingerprint && current.exists() && cloudFingerprint(current.data()?.data) !== expectedFingerprint) throw new CloudConflictError()
    transaction.set(reference, {
      data: cloudSafeData(data),
      version: RELEASE_VERSION,
      updatedAt: firestoreSdk.serverTimestamp(),
    })
  })
}

export async function watchCloudData(uid, callback) {
  const { database, firestoreSdk } = await getServices()
  let revision=0,active=true
  const stop=firestoreSdk.onSnapshot(firestoreSdk.doc(database, 'users', uid), async snapshot => {const observed=++revision;try{const data=snapshot.exists()?await decodeCloud(uid,snapshot.data()):null;if(active&&observed===revision)callback(data)}catch(error){if(active&&observed===revision)callback(undefined,error)}}, error => callback(undefined,error))
  return ()=>{active=false;revision++;stop()}
}
