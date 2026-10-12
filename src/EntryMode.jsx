import { useState } from 'react'
export default function EntryMode({historical,onChange}){
  const [open,setOpen]=useState(Boolean(historical))
  return <details className="entry-options" open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary>Balance handling: {historical?'already included — balances unchanged':'new activity — updates balances'}</summary><p className="modal-note">For a historical entry already reflected in your entered bank or card balance, choose Already included. Otherwise recording it updates the tracked balances.</p><div className="entry-mode"><button type="button" aria-pressed={!historical} className={!historical?'active':''} onClick={()=>onChange(false)}>Not yet included</button><button type="button" aria-pressed={Boolean(historical)} className={historical?'active':''} onClick={()=>onChange(true)}>Already included</button></div></details>
}
