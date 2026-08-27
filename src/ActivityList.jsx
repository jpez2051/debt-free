import { Fragment, useMemo, useState } from 'react'
import { activityEntries, defaultActivityFilters, filterActivity } from './lib/activity.js'
import './activity.css'

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})
export default function ActivityList({data,renderTransaction,onStatements,onBills,onAccounts}) {
  const [filters,setFilters]=useState(defaultActivityFilters)
  const all=useMemo(()=>activityEntries(data),[data])
  const {entries,error}=filterActivity(all,filters)
  const set=(key,value)=>setFilters(f=>({...f,[key]:value}))
  return <section className="activity-list" aria-label="Activity history">
    <div className="activity-filters" role="group" aria-label="Filter activity">
      <label>Account<select value={filters.accountId} onChange={e=>set('accountId',e.target.value)}><option value="">All accounts</option>{data.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      <label>Date range<select value={filters.period} onChange={e=>set('period',e.target.value)}><option value="all">All time</option><option value="month">This month</option><option value="lastMonth">Last month</option><option value="custom">Custom dates</option></select></label>
      <label>Activity type<select value={filters.type} onChange={e=>set('type',e.target.value)}><option value="">All activity types</option><option value="purchase">Purchases / charges</option><option value="payment">Payments</option><option value="refund">Refunds</option><option value="income">Income</option><option value="transfer">Transfers</option><option value="adjustment">Balance adjustments</option></select></label>
      <label>Search<input type="search" value={filters.search} placeholder="Merchant or description" onChange={e=>set('search',e.target.value)}/></label>
      {filters.period==='custom'&&<><label>From<input type="date" value={filters.from} onChange={e=>set('from',e.target.value)} onClick={e=>{try{e.currentTarget.showPicker?.()}catch{}}}/></label><label>Through<input type="date" value={filters.to} onChange={e=>set('to',e.target.value)} onClick={e=>{try{e.currentTarget.showPicker?.()}catch{}}}/></label></>}
    </div>
    <div className="activity-filter-summary"><p role="status" aria-live="polite">{entries.length} matching {entries.length===1?'entry':'entries'} of {all.length}</p><button type="button" className="secondary" onClick={()=>setFilters(defaultActivityFilters())}>Reset filters</button></div>
    <p className="muted">Card payments appear under both involved accounts, but only once in All accounts. Payments are not new spending; card-funded bills are charges.</p>
    {error&&<p role="alert" className="warning-text">{error}</p>}
    <div className="table-list">{entries.map(row=>row.source==='transaction'?<Fragment key={row.id}>{renderTransaction(row.entry)}</Fragment>:<div className="activity-history-row" key={row.id}>
      <div><strong>{row.title}</strong><small>{new Date(`${row.date}T12:00:00`).toLocaleDateString()} · {row.detail}{row.entry.historical?' · Historical':''}</small>{row.source==='billPayment'&&<small>{row.type==='purchase'?'Recurring card charge':'Bill payment'}</small>}{row.source==='cardPayment'&&<small>{row.entry.assignmentStatus==='confirmed'?`Statement due ${data.cardStatements.find(s=>s.id===row.entry.statementId)?.dueDate||'unknown'}`:'Statement not assigned'}</small>}</div>
      <div className="activity-history-actions"><strong>{row.source==='adjustment'?`${money.format(row.entry.before)} → ${money.format(row.entry.after)}`:money.format(row.entry.amount)}</strong><button type="button" className="secondary" onClick={row.source==='cardPayment'?onStatements:row.source==='billPayment'?onBills:onAccounts}>{row.source==='cardPayment'?'View in Debts':row.source==='billPayment'?'View in Bills':'View in Accounts'}</button></div>
    </div>)}</div>
    {!entries.length&&!error&&<p className="empty">{all.length?'No activity matches these filters. Try a wider date range or Reset filters.':'No activity recorded yet. Add an entry to get started.'}</p>}
  </section>
}
