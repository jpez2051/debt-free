import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { RELEASE_VERSION } from './release.js'
import './modal.css'

export default function Modal({title,onSubmit,close,children,showSave=true,draft={}}) {
  const dialogRef=useRef(null),openerRef=useRef(document.activeElement)
  const [viewport,setViewport]=useState(null)
  const baseline=useRef({title,value:JSON.stringify(draft)})
  if(baseline.current.title!==title)baseline.current={title,value:JSON.stringify(draft)}
  const dirty=showSave&&baseline.current.value!==JSON.stringify(draft)
  const [discarding,setDiscarding]=useState(false)
  const requestClose=()=>dirty?setDiscarding(true):close()
  useEffect(()=>{const warn=event=>{if(dirty){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])
  useEffect(()=>{
    const visible=window.visualViewport
    const resize=()=>setViewport(visible?{height:visible.height,top:visible.offsetTop}:null)
    resize();visible?.addEventListener('resize',resize);visible?.addEventListener('scroll',resize)
    return()=>{visible?.removeEventListener('resize',resize);visible?.removeEventListener('scroll',resize)}
  },[])
  useEffect(()=>{
    const root=document.getElementById('root'),wasInert=root?.inert
    if(root)root.inert=true
    const body=dialogRef.current?.querySelector('.entry-dialog-body')
    ;(body?.querySelector('input:not([disabled]),select:not([disabled]),button:not([disabled])')||dialogRef.current?.querySelector('.close'))?.focus({preventScroll:true})
    return()=>{if(root)root.inert=wasInert;openerRef.current?.focus?.({preventScroll:true})}
  },[title])
  const keys=event=>{
    if(event.key==='Escape'){event.preventDefault();requestClose();return}
    if(event.key!=='Tab')return
    const items=[...dialogRef.current.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(item=>item.getClientRects().length)
    const first=items[0],last=items.at(-1)
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
  }
  return createPortal(<div className="modal-backdrop entry-dialog-backdrop" style={viewport?{'--dialog-viewport-height':`${viewport.height}px`,'--dialog-viewport-top':`${viewport.top}px`}:undefined} onMouseDown={event=>{if(event.target===event.currentTarget)requestClose()}}>
    <form ref={dialogRef} className="modal entry-dialog" role="dialog" aria-modal="true" aria-label={title} onSubmit={onSubmit} onKeyDown={keys}>
      <header className="entry-dialog-header"><button type="button" className="close" aria-label="Close dialog" onClick={requestClose}><X/></button><span className="kicker">DEBT FREE v{RELEASE_VERSION}</span><h2>{title}</h2></header>
      <div className="entry-dialog-body">{children}</div>
      {showSave&&<footer className="entry-dialog-footer">{discarding?<div role="alert"><strong>Discard unfinished entry?</strong><p>Nothing in this form has been recorded yet.</p><button type="button" className="secondary" onClick={()=>setDiscarding(false)}>Keep editing</button><button type="button" className="secondary danger" onClick={close}>Discard entry</button></div>:<><button type="button" className="secondary" onClick={requestClose}>Cancel</button><button type="submit" className="primary submit">Save</button></>}</footer>}
    </form>
  </div>,document.body)
}
