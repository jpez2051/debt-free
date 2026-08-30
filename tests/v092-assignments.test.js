import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { prepareData, statementTotals, assignCardPayments, reassignPayment, recordCardPayment, saveStatement } from '../src/lib/finance.js'
import { createRepository, parseBackup } from '../src/lib/storage.js'
import { validateData } from '../src/lib/backup.js'
import { upcomingSummary } from '../src/lib/upcomingSummary.js'
import config from '../vite.config.js'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const now=new Date(2026,7,27,12)
const fixture=()=>({financeVersion:1,accounts:[{id:'c',name:'Fictional Visa',type:'credit',balance:900,minimum:50,nextDueDate:'2026-09-15'},{id:'b',name:'Fictional Bank',type:'checking',balance:2000}],cardStatements:[{id:'aug',cardId:'c',dueDate:'2026-08-15',minimum:50,needsReview:false},{id:'sep',cardId:'c',dueDate:'2026-09-15',minimum:50,needsReview:false}],payments:[{id:'one',cardId:'c',bankId:'b',amount:300,date:'2026-08-05T12:00:00Z',localDate:'2026-08-05',statementId:'sep',cycleDueDateBefore:'2026-09-15',historical:true},{id:'two',cardId:'c',bankId:'b',amount:25,date:'2026-08-08T12:00:00Z',localDate:'2026-08-08'}],transactions:[],bills:[],extra:0})
const totals=d=>d.cardStatements.map(s=>statementTotals(s,d.payments,now).actualPaid)
const immutableDetails=d=>({accounts:d.accounts,payments:d.payments.map(({statementId,assignmentStatus,previousStatementId,...p})=>p),statements:d.cardStatements})

test('legacy guessed and missing assignments remain in history without satisfying a minimum',()=>{
  const raw=fixture(),before=structuredClone(raw),data=prepareData(raw,now)
  assert.deepEqual(raw,before);assert.deepEqual(immutableDetails(data),immutableDetails(raw))
  assert.equal(data.payments[0].previousStatementId,'sep')
  assert.deepEqual(data.payments.map(p=>p.assignmentStatus),['general','unassigned']);assert.ok(data.payments.every(p=>p.statementId===''))
  assert.deepEqual(totals(data),[0,0]);assert.equal(data.payments.reduce((n,p)=>n+p.amount,0),325)
  assert.deepEqual(prepareData(data,now),data)
  assert.equal(statementTotals(raw.cardStatements[1],raw.payments,now).remaining,50)
})
test('pre-statement versions do not guess from payment dates or cycle dates',()=>{
  const raw=fixture();delete raw.financeVersion;delete raw.cardStatements;delete raw.payments[0].statementId
  const data=prepareData(raw,now)
  assert.deepEqual(data.payments.map(p=>p.assignmentStatus),['general','unassigned'])
  assert.ok(totals(data).every(n=>n===0))
})
test('confirming a statement does not silently confirm payments',()=>{
  const data=saveStatement(fixture(),{id:'sep',cardId:'c',dueDate:'2026-09-15',minimum:50},now)
  assert.equal(data.cardStatements[1].needsReview,false);assert.deepEqual(totals(data),[0,0])
})
test('two early payments can be explicitly assigned together, then moved or unassigned',()=>{
  const data=prepareData(fixture(),now),before=immutableDetails(data)
  const assigned=assignCardPayments(data,['one','two'],'aug',now)
  assert.deepEqual(totals(assigned),[325,0]);assert.deepEqual(immutableDetails(assigned),before)
  assert.deepEqual(prepareData(assigned,now),assigned)
  const moved=reassignPayment(assigned,'two','sep','card',now)
  assert.deepEqual(totals(moved),[300,25]);assert.deepEqual(immutableDetails(moved),before)
  const unassigned=reassignPayment(moved,'two','','card',now)
  assert.deepEqual(totals(unassigned),[300,0]);assert.deepEqual(prepareData(unassigned,now),unassigned)
  assert.deepEqual(immutableDetails(unassigned),before)
})
test('invalid bulk requests fail atomically without changing source records',()=>{
  const data=prepareData(fixture(),now)
  data.accounts.push({id:'other',name:'Other fictional card',type:'credit',balance:0})
  data.cardStatements.push({id:'foreign',cardId:'other',dueDate:'2026-09-15',minimum:20})
  data.payments.push({...data.payments[0],id:'foreign-payment',cardId:'other'})
  const before=structuredClone(data)
  for(const [ids,target] of [[[],'sep'],[['one','one'],'sep'],[['missing'],'sep'],[['one'],'foreign'],[['one','foreign-payment'],''],[['one'],'missing']])assert.throws(()=>assignCardPayments(data,ids,target,now))
  assert.deepEqual(data,before)
})
test('logging unassigned payments changes balances once; assigning does not change them again',()=>{
  const data=recordCardPayment(fixture(),{cardId:'c',bankId:'b',amount:30,date:'2026-08-26',statementId:''},now)
  assert.deepEqual(data.accounts.map(a=>a.balance),[870,1970]);assert.deepEqual(totals(data),[0,0])
  const assigned=assignCardPayments(data,[data.payments[0].id],'sep',now)
  assert.deepEqual(assigned.accounts,data.accounts);assert.deepEqual(totals(assigned),[0,30])
  const historical=recordCardPayment(data,{cardId:'c',bankId:'b',amount:20,date:'2026-08-20',historical:true},now)
  assert.deepEqual(historical.accounts,data.accounts);assert.deepEqual(totals(historical),[0,0])
})
test('explicit new early payments combine against one statement only',()=>{
  let data=fixture()
  for(const [date,amount] of [['2026-08-20',30],['2026-08-25',25]])data=recordCardPayment(data,{cardId:'c',bankId:'b',amount,date,statementId:'sep'},now)
  assert.deepEqual(totals(data),[0,55]);assert.equal(statementTotals(data.cardStatements[1],data.payments,now).remaining,0)
  data.payments[0].localDate='2026-08-28';assert.deepEqual(totals(data),[0,30])
})
test('old backups upgrade conservatively; new backups retain confirmed and unassigned choices',()=>{
  const old=parseBackup(JSON.stringify(fixture()));assert.deepEqual(totals(old),[0,0])
  const next=assignCardPayments(old,['one'],'aug',now)
  assert.deepEqual(parseBackup(JSON.stringify(next)),next)
  assert.equal(validateData(next),true)
  for(const status of ['invalid','confirmed','unassigned']){
    const bad=structuredClone(next);bad.payments[0].assignmentStatus=status;bad.payments[0].statementId=status==='confirmed'?'':'aug'
    assert.equal(validateData(bad),false)
  }
})
test('first corrected save preserves original browser data and subsequent loads retain assignments',()=>{
  const original=JSON.stringify(fixture()),items=new Map([['test',original]])
  const storage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)}
  const repo=createRepository(storage,'test'),data=repo.load({})
  assert.equal(items.get('test'),original)
  const next=assignCardPayments(data,['one'],'aug',now);repo.save(next)
  assert.equal(items.get('test-before-v092'),original)
  repo.save(reassignPayment(next,'one','','card',now))
  assert.equal(items.get('test-before-v092'),original)
  assert.equal(createRepository(storage,'test').load({}).payments[0].assignmentStatus,'general')
})
test('September cannot be marked met by unverified older payments',()=>{
  const raw=fixture();raw.cardStatements=raw.cardStatements.filter(s=>s.id==='sep')
  const row=upcomingSummary(prepareData(raw,now),now)[0]
  assert.equal(row.statementId,'sep');assert.equal(row.remaining,50);assert.equal(row.actualPaid,0)
  assert.equal(row.reviewPaymentCount,1)
})
test('actual payment form defaults to unassigned and never chooses a statement from date',async()=>{
  const output=config.plugins[0].transform(await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),'/src/App.jsx')
  const open=output.split('\n').find(l=>l.startsWith(' const openPayment='))
  let form;Function('cards','checking','cashAccounts','setForm','setModal','dateValue',`${open};openPayment()`)([{id:'c'}],[{id:'b'}],[],f=>form=f,()=>{},()=> '2026-08-27')
  assert.equal(form.statementId,'')
  assert.match(output,/cardId:e.target.value,statementId:''/)
  assert.match(output,/<Field label="Statement"><select value=/)
  assert.match(output,/Needs review — assign later/)
})
test('bulk review renders dates, amount, previous unverified assignment and accessible controls',async()=>{
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:Review}=await server.ssrLoadModule('/src/PaymentAssignments.jsx')
    const html=renderToStaticMarkup(React.createElement(Review,{data:prepareData(fixture(),now),update(){throw new Error('Rendering must not save')}}))
    for(const text of ['2026-08-08','$25.00','Needs review','Select all shown','Show only payments needing review','Historical/general — no statement needed','Keep for review','type="checkbox"'])assert.ok(html.includes(text),text)
    const {default:Summary}=await server.ssrLoadModule('/src/UpcomingSummary.jsx')
    const dashboard=renderToStaticMarkup(React.createElement(Summary,{data:prepareData(fixture(),now),now,onStatements(){}}))
    assert.ok(dashboard.includes('recent payment may affect this minimum'))
  }finally{await server.close()}
})
