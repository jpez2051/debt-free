import { useEffect, useState } from 'react'
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

  useEffect(()=>{
    let frame=0
    const sync=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        const viewport=window.visualViewport
        const pageTop=viewport?.pageTop ?? window.scrollY
        const viewportHeight=viewport?.height ?? window.innerHeight
        const nav=document.querySelector('body>.mobile-primary-nav')
        if(nav){
          const navHeight=nav.getBoundingClientRect().height || 72
          document.documentElement.style.setProperty('--df-mobile-nav-top',`${Math.max(0,pageTop+viewportHeight-navHeight)}px`)
        }
        const sheet=document.querySelector('body>.mobile-nav-sheet')
        if(sheet){
          const navHeight=nav?.getBoundingClientRect().height || 72
          const sheetHeight=sheet.getBoundingClientRect().height || 0
          document.documentElement.style.setProperty('--df-mobile-sheet-top',`${Math.max(pageTop+8,pageTop+viewportHeight-navHeight-sheetHeight-12)}px`)
        }
      })
    }
    sync()
    const viewport=window.visualViewport
    viewport?.addEventListener('scroll',sync)
    viewport?.addEventListener('resize',sync)
    window.addEventListener('scroll',sync,{passive:true})
    window.addEventListener('resize',sync)
    window.addEventListener('orientationchange',sync)
    return()=>{
      cancelAnimationFrame(frame)
      viewport?.removeEventListener('scroll',sync)
      viewport?.removeEventListener('resize',sync)
      window.removeEventListener('scroll',sync)
      window.removeEventListener('resize',sync)
      window.removeEventListener('orientationchange',sync)
    }
  },[open])

  const chooseGroup=group=>{
    if(group.items.length===1){clickSidebar(group.items[0]);setOpen(null);return}
    setOpen(open===group.id?null:group.id)
  }

  const navLayer=<>
    {open&&<div className="mobile-nav-scrim" onClick={()=>setOpen(null)}/>} 
    {open&&<section className="mobile-nav-sheet" aria-label={`${groups.find(g=>g.id===open)?.label} navigation`}>
      <div className="mobile-nav-sheet-head"><strong>{groups.find(g=>g.id===open)?.label}</strong><button type="button" onClick={()=>setOpen(null)} aria-label="Close"><X size={18}/></button></div>
      {groups.find(g=>g.id===open)?.items.map(item=><button type="button" key={item} onClick={()=>{clickSidebar(item);setOpen(null)}}>{item}</button>)}
    </section>}
    <nav className="mobile-primary-nav" aria-label="Primary navigation">
      {groups.map(group=>{const Icon=group.icon;return <button type="button" key={group.id} className={active===group.id?'active':''} onClick={()=>chooseGroup(group)}><Icon size={20}/><span>{group.label}</span></button>})}
    </nav>
  </>

  return createPortal(navLayer,document.body)
}
