import { useEffect, useMemo, useRef, useState } from 'react'
import { Cloud, LogIn, LogOut, Plus, ShieldCheck, Upload } from 'lucide-react'
import App from './App.jsx'
import { prepareData } from './lib/finance.js'
import { loadState } from './lib/storage.js'
import { setActiveData, setCloudSession } from './lib/cloudState.js'
import { observeUser, readCloudData, signIn, signOutUser, watchCloudData, writeCloudData } from './lib/firebaseClient.js'
import { cloudFingerprint } from './lib/cloudSync.js'

const starter = { accounts:[], transactions:[], payments:[], bills:[], billPayments:[], creditScores:[], strategy:'avalanche', extra:0 }

function CloudScreen({ children }) {
  return <main className="cloud-screen"><section className="cloud-card"><div className="cloud-mark"><Cloud size={24}/></div>{children}</section></main>
}

export default function CloudApp() {
  const localData = useMemo(() => loadState(starter), [])
  const hasLegacyRecords = useMemo(() => (
    localData.accounts.length > 0 ||
    localData.transactions.length > 0 ||
    localData.payments.length > 0 ||
    localData.bills.length > 0 ||
    (localData.billPayments || []).length > 0 ||
    localData.creditScores.length > 0 ||
    (localData.incomeSchedules || []).length > 0
  ), [localData])
  const [phase, setPhase] = useState('checking')
  const [user, setUser] = useState(null)
  const [cloudData, setCloudData] = useState(null)
  const [message, setMessage] = useState('')
  const queue = useRef(Promise.resolve())
  const fingerprint = useRef('')
  const saving = useRef(0)
  const watcher = useRef(() => {})
  const [workspaceVersion,setWorkspaceVersion]=useState(0)

  const actions=()=>({ signOut:logout, restore:restoreCloudData, reload:reloadCloudData, clear:clearCloudData })
  function acceptCloudData(saved, signedIn, sync='Saved in the cloud') {
    const ready=prepareData(saved||starter)
    fingerprint.current=cloudFingerprint(saved||starter)
    setCloudData(ready); setActiveData(ready); setWorkspaceVersion(x=>x+1)
    setCloudSession({ status:'ready', user:signedIn, sync, actions:actions() })
  }
  async function startWatching(signedIn) {
    watcher.current?.()
    const unsubscribe=await watchCloudData(signedIn.uid,(remote,error)=>{
      if(error){setCloudSession({status:'ready',user:signedIn,sync:'Cloud updates need attention',actions:actions()});return}
      if(!remote||saving.current)return
      const nextFingerprint=cloudFingerprint(remote)
      if(nextFingerprint===fingerprint.current)return
      acceptCloudData(remote,signedIn,'Updated from another device')
    })
    watcher.current=unsubscribe
  }

  useEffect(() => {
    const stop = observeUser(async signedIn => {
      setUser(signedIn)
      if (!signedIn) { watcher.current?.(); watcher.current=()=>{}; setPhase('signedOut'); setCloudData(null); setActiveData(null); setCloudSession({ status:'signedOut', user:null, sync:'', actions:{ signIn:login } }); return }
      setPhase('loading')
      setCloudSession({ status:'loading', user:signedIn, sync:'Opening your private cloud record…', actions:{ signOut:logout } })
      try {
        const saved = await readCloudData(signedIn.uid)
        if (saved) { acceptCloudData(saved,signedIn); setPhase('ready'); startWatching(signedIn) }
        else { setPhase('migration'); setCloudSession({ status:'migration', user:signedIn, sync:hasLegacyRecords ? 'Choose how to begin' : 'Ready for a new workspace', actions:{ signOut:logout, importLocal:importLocalData, startFresh } }) }
      } catch (error) { setMessage(error?.message || 'Your cloud record could not be opened.'); setPhase('error'); setCloudSession({ status:'error', user:signedIn, sync:'Cloud connection needs attention', actions:{ signOut:logout } }) }
    })
    return ()=>{stop();watcher.current?.()}
  }, [])

  async function login() {
    setMessage('')
    try { await signIn() }
    catch (error) { setMessage(error?.message || 'Google sign-in could not be completed.') }
  }
  async function logout() {
    try { await signOutUser() } catch (error) { setMessage(error?.message || 'Could not sign out right now.') }
  }
  async function importLocalData() {
    setMessage('')
    try {
      await writeCloudData(user.uid, localData)
      acceptCloudData(localData,user); setPhase('ready'); startWatching(user)
    } catch (error) { setMessage(error?.message || 'Your browser records were not uploaded. Nothing was changed.') }
  }
  async function startFresh() {
    setMessage('')
    try {
      const fresh = prepareData(starter)
      await writeCloudData(user.uid, fresh)
      acceptCloudData(fresh,user); setPhase('ready'); startWatching(user)
    } catch (error) { setMessage(error?.message || 'Your new workspace could not be created. Nothing was changed.') }
  }
  async function restoreCloudData(incoming) {
    if (!user) throw new Error('Sign in before restoring a backup.')
    await writeCloudData(user.uid, incoming, fingerprint.current)
    acceptCloudData(incoming,user,'Backup restored to the cloud')
  }
  async function reloadCloudData() {
    if(!user) return
    const saved=await readCloudData(user.uid)
    if(!saved) throw new Error('No cloud workspace was found to reload.')
    acceptCloudData(saved,user,'Reloaded latest cloud copy')
  }
  async function clearCloudData() {
    if(!user) throw new Error('Sign in before clearing this workspace.')
    const fresh=prepareData(starter)
    await writeCloudData(user.uid,fresh,fingerprint.current)
    acceptCloudData(fresh,user,'Cloud workspace cleared')
  }
  const persist = data => {
    const snapshot = prepareData(data)
    setActiveData(snapshot)
    saving.current+=1
    setCloudSession({ status:'ready', user, sync:'Saving…', actions:actions() })
    const save = queue.current.catch(() => {}).then(async () => {
      await writeCloudData(user.uid, snapshot, fingerprint.current)
      fingerprint.current=cloudFingerprint(snapshot)
      setCloudSession({ status:'ready', user, sync:'Saved in the cloud', actions:actions() })
    })
    queue.current = save
    return save.then(value=>{saving.current=Math.max(0,saving.current-1);return value}).catch(error => {
      saving.current=Math.max(0,saving.current-1)
      setCloudSession({ status:'ready', user, sync:error?.code==='cloud/conflict'?'Newer cloud copy available — reload before continuing':'Cloud save failed — keep this page open and try again', actions:actions() })
      throw error
    })
  }

  if (phase === 'checking' || phase === 'loading') return <CloudScreen><span className="kicker">DEBT FREE CLOUD</span><h1>Opening your private financial workspace…</h1><p>Checking your secure sign-in and cloud record.</p></CloudScreen>
  if (phase === 'signedOut') return <CloudScreen><span className="kicker">DEBT FREE CLOUD</span><h1>Your records can follow you.</h1><p>Sign in with Google to use your private cloud workspace on this phone or computer.</p><button className="primary cloud-action" type="button" onClick={login}><LogIn size={17}/> Continue with Google</button>{message&&<div className="backup-message">{message}</div>}<small>Only your signed-in account can open its financial record.</small></CloudScreen>
  if (phase === 'migration' && hasLegacyRecords) return <CloudScreen><span className="kicker">WELCOME TO DEBT FREE</span><h1>Bring your records along, or start fresh.</h1><p>This browser has existing accounts, activity, bills, payments, or scores. You can copy them to the Google account you just selected, or create a completely blank private workspace instead.</p><div className="cloud-migration-counts"><span>{localData.accounts.length} accounts</span><span>{localData.transactions.length} activity entries</span><span>{localData.payments.length+(localData.billPayments||[]).length} payments</span></div><button className="primary cloud-action" type="button" onClick={importLocalData}><Upload size={17}/> Copy my records to the cloud</button><button className="secondary cloud-action" type="button" onClick={startFresh}><Plus size={17}/> Start with a blank workspace</button><button className="secondary cloud-action" type="button" onClick={logout}><LogOut size={17}/> Use a different Google account</button>{message&&<div className="backup-message">{message}</div>}<small><ShieldCheck size={14}/> Your browser records stay where they are unless you choose to copy them.</small></CloudScreen>
  if (phase === 'migration') return <CloudScreen><span className="kicker">WELCOME TO DEBT FREE</span><h1>Start your private workspace.</h1><p>There aren’t any local Debt Free records in this browser. Begin with a blank workspace now; you can restore a backup later from Settings if you have one.</p><button className="primary cloud-action" type="button" onClick={startFresh}><Plus size={17}/> Start with a blank workspace</button><button className="secondary cloud-action" type="button" onClick={logout}><LogOut size={17}/> Use a different Google account</button>{message&&<div className="backup-message">{message}</div>}<small><ShieldCheck size={14}/> A blank workspace is created only after you select “Start with a blank workspace.”</small></CloudScreen>
  if (phase === 'error') return <CloudScreen><span className="kicker">CLOUD CONNECTION</span><h1>We could not open your private record.</h1><p>{message||'Check the Firebase setup, then try again.'}</p><button className="secondary cloud-action" type="button" onClick={logout}><LogOut size={17}/> Sign out</button></CloudScreen>
  return <App key={`${user?.uid}-${workspaceVersion}`} initialData={cloudData||starter} persist={persist}/>
}
