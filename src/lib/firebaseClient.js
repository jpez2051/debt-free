import { RELEASE_VERSION } from '../release.js'

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

export async function readCloudData(uid) {
  const { database, firestoreSdk } = await getServices()
  const snapshot = await firestoreSdk.getDoc(firestoreSdk.doc(database, 'users', uid))
  return snapshot.exists() ? snapshot.data()?.data || null : null
}

export async function writeCloudData(uid, data) {
  const { database, firestoreSdk } = await getServices()
  await firestoreSdk.setDoc(firestoreSdk.doc(database, 'users', uid), {
    data,
    version: RELEASE_VERSION,
    updatedAt: firestoreSdk.serverTimestamp(),
  })
}
