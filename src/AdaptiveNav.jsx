import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, Home, Menu, Target, WalletCards, X } from 'lucide-react'

const groups = [
  { id:'home', label:'Home', icon:Home, items:['Dashboard'] },
  { id:'money', label:'Money', icon:WalletCards, items:['Accounts','Activity'] },
  { id:'plan', label:'Plan', icon:Target, items:['Debts','Payoff Plan'] },
  { id:'spending', label:'Spending', icon:BarChart3, items:['Spending','Bills'] },
  { id:'more', label:'More', icon:Menu, items:['Insights','Settings'] },
]

function clickSidebar(label){
  const buttons=[...document.querySelectorAll('.sidebar nav button')]
  const match=buttons.find(b=>b.textContent.trim()===label)
  match?.click()
}

export default function AdaptiveNav(){
  const [open,setOpen]=useState(null)
  const [active,setActive]=useState('home')
  const sheet=useRef(null)

  useEffect(()=>{
    const observer=new MutationObserver(()=>{
      const activeButton=document.querySelector('.sidebar nav button.active')
      const label=activeButton?.textContent?.trim()
      const group=groups.find(g=>g.items.includes(label))
      if(group)setActive(group.id)
    })
    const nav=document.querySelector('.sidebar nav')
    if(nav)observer.observe(nav,{subtree:true,attributes:true,attributeFilter:['class']})
    return()=>observer.disconnect()
  },[])

  useEffect(()=>{if(!open)return;const opener=document.activeElement;sheet.current?.querySelector('button')?.focus();const close=e=>{if(e.key==='Escape')setOpen(null);if(e.key==='Tab'){const items=[...sheet.current.querySelectorAll('button')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',close);return()=>{document.removeEventListener('keydown',close);opener?.focus?.()}},[open])

  const chooseGroup=group=>{
    if(group.items.length===1){clickSidebar(group.items[0]);setOpen(null);return}
    setOpen(open===group.id?null:group.id)
  }

  const navLayer=<>
    {open&&<div className="mobile-nav-scrim" onClick={()=>setOpen(null)}/>} 
    {open&&<section ref={sheet} className="mobile-nav-sheet" role="dialog" aria-modal="true" aria-label={`${groups.find(g=>g.id===open)?.label} navigation`}>
      <div className="mobile-nav-sheet-head"><strong>{groups.find(g=>g.id===open)?.label}</strong><button type="button" onClick={()=>setOpen(null)} aria-label="Close"><X size={18}/></button></div>
      {groups.find(g=>g.id===open)?.items.map(item=><button type="button" key={item} onClick={()=>{clickSidebar(item);setOpen(null)}}>{item}</button>)}
    </section>}
    <nav className="mobile-primary-nav" aria-label="Primary navigation">
      {groups.map(group=>{const Icon=group.icon;return <button type="button" key={group.id} className={active===group.id?'active':''} onClick={()=>chooseGroup(group)}><Icon size={20}/><span>{group.label}</span></button>})}
    </nav>
  </>

  return createPortal(navLayer,document.body)
}
