import { useRef, useState } from 'react'
import { Download, HardDrive, ShieldCheck, Upload, X } from 'lucide-react'
import { BACKUP_SCHEMA, RELEASE_VERSION, STORAGE_KEY } from './release.js'

function readStoredData(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

function validateData(data){
  return Boolean(data && typeof data === 'object' && Array.isArray(data.accounts) && Array.isArray(data.transactions) && Array.isArray(data.payments) && Array.isArray(data.bills))
}

function downloadJson(payload, filename){
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function backupPayload(data){
  return { schema:BACKUP_SCHEMA, app:'Debt Free', version:RELEASE_VERSION, exportedAt:new Date().toISOString(), data }
}

export default function DataSafety(){
  const [open,setOpen]=useState(false)
  const [message,setMessage]=useState('')
  const inputRef=useRef(null)
  const data=readStoredData()
  const counts={accounts:data?.accounts?.length||0,activity:data?.transactions?.length||0,payments:data?.payments?.length||0,bills:data?.bills?.length||0}

  const exportBackup=()=>{
    const current=readStoredData()
    if(!validateData(current)){setMessage('There is no valid Debt Free data to back up yet.');return}
    const stamp=new Date().toISOString().slice(0,10)
    downloadJson(backupPayload(current),`debt-free-backup-v${RELEASE_VERSION}-${stamp}.json`)
    localStorage.setItem('debt-free-last-backup',new Date().toISOString())
    setMessage('Backup downloaded successfully.')
  }

  const restoreBackup=async e=>{
    const file=e.target.files?.[0]
    e.target.value=''
    if(!file)return
    try{
      const parsed=JSON.parse(await file.text())
      const incoming=parsed?.schema===BACKUP_SCHEMA?parsed.data:parsed?.data||parsed
      if(!validateData(incoming))throw new Error('invalid')
      const current=readStoredData()
      if(validateData(current)){
        const stamp=new Date().toISOString().replace(/[:.]/g,'-')
        downloadJson(backupPayload(current),`debt-free-pre-restore-${stamp}.json`)
      }
      localStorage.setItem(STORAGE_KEY,JSON.stringify(incoming))
      localStorage.setItem('debt-free-last-restore',new Date().toISOString())
      window.location.reload()
    }catch{
      setMessage('That file does not look like a valid Debt Free backup. Nothing was changed.')
    }
  }

  const lastBackup=localStorage.getItem('debt-free-last-backup')

  return <>
    <div className="release-badge">Debt Free v{RELEASE_VERSION}</div>
    <button className="data-safety-launch" type="button" onClick={()=>setOpen(true)}><ShieldCheck size={16}/> Data & backup</button>
    {open&&<div className="data-safety-backdrop" onMouseDown={()=>setOpen(false)}>
      <section className="data-safety-panel" onMouseDown={e=>e.stopPropagation()}>
        <button className="data-safety-close" type="button" onClick={()=>setOpen(false)} aria-label="Close"><X size={18}/></button>
        <div className="data-safety-icon"><HardDrive size={22}/></div>
        <span className="kicker">DATA SAFETY</span>
        <h2>Your financial data stays in this browser</h2>
        <p className="data-safety-copy">The public website contains the app code, but your balances, purchases, income, bills and payments are stored in this browser's local storage unless you export a backup yourself.</p>
        <div className="data-counts"><span><b>{counts.accounts}</b> accounts</span><span><b>{counts.activity}</b> activity records</span><span><b>{counts.payments}</b> payments</span><span><b>{counts.bills}</b> bills</span></div>
        <div className="data-warning"><ShieldCheck size={17}/><span>Clearing browser/site data can erase local records. Download backups regularly if you use Debt Free with real data.</span></div>
        <button type="button" className="primary data-safety-action" onClick={exportBackup}><Download size={17}/> Download backup</button>
        <button type="button" className="secondary data-safety-action" onClick={()=>inputRef.current?.click()}><Upload size={17}/> Restore from backup</button>
        <input ref={inputRef} className="hidden-file" type="file" accept="application/json,.json" onChange={restoreBackup}/>
        <small className="backup-meta">{lastBackup?`Last backup from this browser: ${new Date(lastBackup).toLocaleString()}`:'No backup has been downloaded from this browser yet.'}</small>
        {message&&<div className="backup-message">{message}</div>}
      </section>
    </div>}
  </>
}
