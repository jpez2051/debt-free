import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { activityEntries, defaultActivityFilters, filterActivity, activityDateRange } from '../src/lib/activity.js'
import config from '../vite.config.js'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const now=new Date(2026,7,27,12)
const date=localDate=>({localDate,date:`${localDate}T12:00:00Z`})
const fixture=()=>({accounts:[{id:'bank',name:'Test checking',type:'checking'},{id:'card',name:'Test card',type:'credit'}],transactions:[
  {id:'same',accountId:'card',kind:'purchase',merchant:'Sample Store',category:'Shopping',amount:20,...date('2026-08-01')},
  {id:'refund',accountId:'card',kind:'refund',merchant:'Sample Store',category:'Shopping',amount:5,...date('2026-08-20')},
  {id:'income',accountId:'bank',kind:'income',merchant:'Paycheck',amount:500,...date('2026-07-31')},
  {id:'transfer',accountId:'bank',kind:'transfer',merchant:'External transfer',description:'To savings',amount:50,...date('2026-08-27')},
],payments:[{id:'same',cardId:'card',bankId:'bank',amount:40,...date('2026-08-25')},{id:'extra',cardId:'card',bankId:'bank',amount:40,...date('2026-08-25')}],bills:[],billPayments:[{id:'charge',billName:'Test music',bankId:'card',fundingType:'credit',amount:22,...date('2026-08-15')},{id:'cash',billName:'Test utility',bankId:'bank',fundingType:'checking',amount:75,...date('2026-07-01')}],adjustments:[{id:'adjust',accountId:'card',before:100,after:110,delta:10,reason:'Statement correction',...date('2026-08-22')}],cardStatements:[]})
const filtered=(overrides={},data=fixture())=>filterActivity(activityEntries(data),{...defaultActivityFilters(),...overrides},now)

test('activity combines existing sources without mutation, copying records, or ID collisions',()=>{
  const data=fixture(),before=structuredClone(data),rows=activityEntries(data)
  assert.equal(rows.length,9);assert.equal(new Set(rows.map(r=>r.id)).size,9)
  assert.deepEqual(data,before);assert.equal(rows.find(r=>r.id==='transaction:same').entry,data.transactions[0])
  assert.deepEqual(rows.map(r=>r.date),rows.map(r=>r.date).sort().reverse())
  assert.equal(filtered().entries.length,9)
})
test('card payments match either involved account but appear once in All accounts',()=>{
  for(const accountId of ['','bank','card'])assert.equal(filtered({accountId}).entries.filter(r=>r.id==='cardPayment:same').length,1)
  assert.equal(filtered({accountId:'missing'}).entries.length,0)
  assert.equal(filtered({accountId:'bank',type:'payment'}).entries.length,3)
  assert.equal(filtered({accountId:'card',type:'payment'}).entries.length,2)
})
test('same-day equal payments stay distinct and recurring card bills are charges',()=>{
  assert.equal(filtered({type:'payment'}).entries.length,3)
  assert.deepEqual(filtered({type:'purchase'}).entries.map(r=>r.id).sort(),['billPayment:charge','transaction:same'])
  for(const type of ['income','transfer','refund','adjustment'])assert.equal(filtered({type}).entries.length,1)
  const data=fixture();delete data.billPayments[0].fundingType
  assert.equal(filtered({type:'purchase'},data).entries.length,2)
})
test('filters combine account, type, dates and case-insensitive description search',()=>{
  assert.deepEqual(filtered({accountId:'card',type:'refund',period:'month',search:'  SAMPLE  '}).entries.map(r=>r.id),['transaction:refund'])
  assert.equal(filtered({search:'to savings'}).entries[0].id,'transaction:transfer')
  assert.equal(filtered({search:'statement correction'}).entries[0].source,'adjustment')
  assert.equal(filtered({search:'no merchant matches'}).entries.length,0)
})
test('month ranges use local calendar boundaries, including year rollover and leap years',()=>{
  assert.deepEqual(activityDateRange({period:'lastMonth'},new Date(2026,0,3,12)),{from:'2025-12-01',to:'2025-12-31'})
  assert.deepEqual(activityDateRange({period:'lastMonth'},new Date(2024,2,1,12)),{from:'2024-02-01',to:'2024-02-29'})
  assert.equal(filtered({period:'month'}).entries.length,7)
  assert.equal(filtered({period:'lastMonth'}).entries.length,2)
})
test('custom date boundaries are inclusive, allow open ends, and reject invalid ranges',()=>{
  assert.equal(filtered({period:'custom',from:'2026-08-25',to:'2026-08-25'}).entries.length,2)
  assert.equal(filtered({period:'custom',from:'2026-08-25'}).entries.length,3)
  assert.equal(filtered({period:'custom',to:'2026-07-31'}).entries.length,2)
  for(const range of [{from:'2026-08-27',to:'2026-08-01'},{from:'2026-02-30'}]){const result=filtered({period:'custom',...range});assert.ok(result.error);assert.equal(result.entries.length,0)}
  assert.equal(filtered({period:'all',from:'bad'}).error,'')
})
test('recorded local day is preferred over UTC day; resetting creates independent empty filters',()=>{
  const data=fixture();data.transactions[0].date='2026-08-02T01:00:00Z'
  assert.equal(filtered({period:'custom',from:'2026-08-01',to:'2026-08-01'},data).entries[0].id,'transaction:same')
  const first=defaultActivityFilters();first.search='something'
  assert.equal(defaultActivityFilters().search,'');assert.equal(defaultActivityFilters().period,'all')
})
test('release pipeline preserves ledger edit/delete handlers and routes to existing management pages',async()=>{
  const output=config.plugins[0].transform(await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),'/src/App.jsx')
  const activity=output.split('\n').find(l=>l.includes("page==='transactions'&&<PageHead"))
  assert.match(activity,/<ActivityList data=\{data\}/)
  assert.match(activity,/renderTransaction=\{t=><ActionRow/)
  assert.match(activity,/onRemove=\{\(\)=>removeTx\(t\)\}/)
  assert.match(activity,/onEdit=\{t.kind==='refund'\?undefined/)
  for(const target of ['debts','bills','accounts'])assert.ok(activity.includes(`setPage('${target}')`))
})
test('Activity renders named filter controls, matching count, payment navigation and empty state',async()=>{
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:Activity}=await server.ssrLoadModule('/src/ActivityList.jsx')
    const props={data:fixture(),renderTransaction:t=>React.createElement('span',null,t.merchant),onStatements(){},onBills(){},onAccounts(){}}
    const html=renderToStaticMarkup(React.createElement(Activity,props))
    for(const text of ['All accounts','All time','Last month','Custom dates','All activity types','Merchant or description','9 matching entries of 9','Reset filters','View in Debts','View in Bills','View in Accounts'])assert.ok(html.includes(text),text)
    const empty=renderToStaticMarkup(React.createElement(Activity,{...props,data:{accounts:[],transactions:[],payments:[],bills:[]}}))
    assert.ok(empty.includes('No activity recorded yet'))
  }finally{await server.close()}
})
