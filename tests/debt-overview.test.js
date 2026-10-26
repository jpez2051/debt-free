import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createServer} from 'vite'
import {prepareData,saveLedgerTransaction,recordCardPayment,recordRefund,reconcileAccount} from '../src/lib/finance.js'
import {recordChange} from '../src/lib/changeHistory.js'
import {startDebtProgress,debtProgressSummary} from '../src/lib/debtProgress.js'
import {clearPending} from '../src/lib/clearPending.js'
import {validateData} from '../src/lib/backup.js'
import {encodeWorkspace,decodeWorkspace} from '../src/lib/splitStorage.js'
import {anonymizeDiagnosticData} from '../src/lib/diagnosticExport.js'
const now=new Date(2026,9,26,12)
const base=()=>prepareData({financeVersion:1,accounts:[{id:'bank',name:'Checking',type:'checking',balance:2000},{id:'card',name:'Card',type:'credit',balance:900,limit:1000},{id:'credit',name:'Credit',type:'credit',balance:-100,limit:1000}],transactions:[],payments:[],bills:[],extra:0},now)
const save=(before,after)=>recordChange(before,after,'Saved change',now)
test('baseline is a recorded positive-debt snapshot, with separate card credits and no invented history',()=>{
 const data=base(),before=structuredClone(data),summary=debtProgressSummary(data)
 assert.equal(summary.debt,900);assert.equal(summary.credits,100);assert.equal(summary.delta,null)
 const started=startDebtProgress(data,now);assert.equal(started.debtProgress.date,'2026-10-26');assert.equal(started.debtProgress.startingDebt,900);assert.equal(debtProgressSummary(started).delta,0);assert.deepEqual(data,before)
 assert.throws(()=>startDebtProgress({...data,accounts:[data.accounts[0]]},now),/Add a card/)
 assert.deepEqual(recordChange(data,structuredClone(data),'Saved change',now),data)
})
test('the next ordinary saved update initializes before the payment rather than losing its reduction',()=>{
 const before=base(),after=save(before,recordCardPayment(before,{cardId:'card',bankId:'bank',amount:100,date:'2026-10-26'},now)),summary=debtProgressSummary(after)
 assert.equal(after.debtProgress.startingDebt,900);assert.equal(summary.debt,800);assert.equal(summary.delta,-100);assert.equal(summary.tone,'decrease');assert.deepEqual(summary.reasons,[])
})
test('net change includes payments, charges, interest and refunds, but not already-included payments twice',()=>{
 let data=startDebtProgress(base(),now)
 data=save(data,recordCardPayment(data,{cardId:'card',bankId:'bank',amount:100,date:'2026-10-26'},now))
 data=save(data,saveLedgerTransaction(data,{accountId:'card',merchant:'Shop',amount:50,date:'2026-10-26',category:'Other'},'purchase',now))
 data=save(data,recordRefund(data,{accountId:'card',merchant:'Return',amount:20,date:'2026-10-26'},now))
 data=save(data,saveLedgerTransaction(data,{accountId:'card',merchant:'Interest',amount:15,date:'2026-10-26',category:'Debt Costs',subcategory:'Interest'},'purchase',now))
 assert.equal(debtProgressSummary(data).delta,-55)
 const history=save(data,recordCardPayment(data,{cardId:'card',bankId:'bank',amount:500,date:'2026-09-01',historical:true},now))
 assert.equal(debtProgressSummary(history).delta,-55);assert.deepEqual(debtProgressSummary(history).reasons,[])
})
test('pending entries do not move posted debt; normal clearing is real activity, not a correction',()=>{
 const data=startDebtProgress(base(),now),pending=save(data,saveLedgerTransaction(data,{accountId:'card',merchant:'Shop',amount:200,date:'2026-10-26',status:'pending'},'purchase',now))
 assert.equal(debtProgressSummary(pending).delta,0)
 const cleared=save(pending,clearPending(pending,'transaction',pending.transactions[0].id,now));assert.equal(debtProgressSummary(cleared).delta,200);assert.equal(debtProgressSummary(cleared).tone,'increase');assert.deepEqual(debtProgressSummary(cleared).reasons,[])
 const pendingPayment=save(data,recordCardPayment(data,{cardId:'card',bankId:'bank',amount:25,date:'2026-10-26',status:'pending'},now))
 const postedPayment=save(pendingPayment,clearPending(pendingPayment,'payment',pendingPayment.payments[0].id,now));assert.equal(debtProgressSummary(postedPayment).delta,-25);assert.equal(debtProgressSummary(postedPayment).tone,'decrease')
})
test('account additions/removals and balance corrections are explained and never colored as payoff',()=>{
 const data=startDebtProgress(base(),now),added=save(data,{...data,accounts:[...data.accounts,{id:'new',name:'New card',type:'credit',balance:200}]})
 assert.equal(debtProgressSummary(added).delta,200);assert.equal(debtProgressSummary(added).tone,'neutral');assert.ok(added.debtProgress.reasons.includes('accounts-changed'))
 const removed=save(data,{...data,accounts:data.accounts.filter(a=>a.id!=='card')});assert.equal(debtProgressSummary(removed).delta,-900);assert.equal(debtProgressSummary(removed).tone,'neutral')
 const corrected=save(data,reconcileAccount(data,{accountId:'card',balance:800,reason:'Checked correction'},now));assert.equal(debtProgressSummary(corrected).delta,-100);assert.equal(debtProgressSummary(corrected).tone,'neutral');assert.ok(corrected.debtProgress.reasons.includes('balance-correction'))
 const checked=save(data,reconcileAccount(data,{accountId:'card',balance:900,reason:'Verified against bank'},now));assert.deepEqual(checked.debtProgress.reasons,[])
 const zeroAdded=save(data,{...data,accounts:[...data.accounts,{id:'zero',name:'Paid card',type:'credit',balance:0}]});assert.deepEqual(zeroAdded.debtProgress.reasons,[])
})
test('backdated additions and edits/removals of posted activity are explained as recording corrections',()=>{
 const data=startDebtProgress(base(),now),backdated=save(data,saveLedgerTransaction(data,{accountId:'card',merchant:'Late entry',amount:20,date:'2026-09-01'},'purchase',now))
 assert.equal(debtProgressSummary(backdated).tone,'neutral');assert.ok(backdated.debtProgress.reasons.includes('activity-correction'))
 const before=saveLedgerTransaction(base(),{accountId:'card',merchant:'Original',amount:50,date:'2026-10-25'},'purchase',now),started=startDebtProgress(before,now)
 const edit=save(started,saveLedgerTransaction(started,{...started.transactions[0],date:'2026-10-25',amount:30},'purchase',now));assert.equal(debtProgressSummary(edit).delta,-20);assert.equal(debtProgressSummary(edit).tone,'neutral')
 const annotated=save(started,saveLedgerTransaction(started,{...started.transactions[0],date:'2026-10-25',description:'A note'},'purchase',now));assert.deepEqual(annotated.debtProgress.reasons,[])
})
test('first card establishes a baseline, reset changes no money, and session Undo preserves the old reference',()=>{
 const empty=prepareData({...base(),accounts:[base().accounts[0]]},now),added=save(empty,{...empty,accounts:[...empty.accounts,base().accounts[1]]});assert.equal(debtProgressSummary(added).delta,0)
 const started=startDebtProgress(base(),now),paid=save(started,recordCardPayment(started,{cardId:'card',bankId:'bank',amount:100,date:'2026-10-26'},now))
 const reset=recordChange(paid,startDebtProgress(paid,new Date(2026,10,1,12)),'Started debt comparison',new Date(2026,10,1,12));assert.equal(reset.debtProgress.date,'2026-11-01');assert.equal(debtProgressSummary(reset).delta,0);assert.deepEqual(reset.accounts,paid.accounts)
 const undone=recordChange(reset,paid,'Undid latest change',now);assert.deepEqual(undone.debtProgress,paid.debtProgress)
})
test('snapshot survives backups, split cloud encoding, diagnostics and invalid snapshots are rejected',async()=>{
 const data=startDebtProgress(base(),now);assert.ok(validateData(data));assert.deepEqual(JSON.parse(JSON.stringify(data)).debtProgress,data.debtProgress)
 const encoded=await encodeWorkspace(data),decoded=await decodeWorkspace(encoded.manifest,async id=>encoded.parts.get(id));assert.deepEqual(decoded.debtProgress,data.debtProgress)
 assert.deepEqual(anonymizeDiagnosticData(data).debtProgress,data.debtProgress)
 for(const patch of [{startingDebt:-1},{startingDebt:1.001},{date:'2026-02-30'},{capturedAt:'bad'},{reasons:['unknown']},{reasons:'bad'}])assert.equal(validateData({...data,debtProgress:{...data.debtProgress,...patch}}),false)
 assert.ok(validateData(base()))
})
test('dashboard shows neutral debt total with accessible colored deltas and explanatory correction states',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'})
 try{
  const {default:Overview}=await server.ssrLoadModule('/src/DebtOverview.jsx')
  const started=startDebtProgress(base(),now),paid=save(started,recordCardPayment(started,{cardId:'card',bankId:'bank',amount:100,date:'2026-10-26'},now))
  const render=data=>renderToStaticMarkup(React.createElement(Overview,{data,onStart(){},onCards(){}}))
  const html=render(paid);assert.match(html,/Card debt/);assert.match(html,/\$800\.00/);assert.match(html,/debt-change decrease/);assert.match(html,/↓ −\$100\.00 decrease/);assert.match(html,/since/);assert.match(html,/card credits is separate/)
  assert.match(render(base()),/No saved starting snapshot/)
  assert.match(render(save(started,reconcileAccount(started,{accountId:'card',balance:800,reason:'Correction'},now))),/Why this comparison is neutral/)
  const {default:App}=await server.ssrLoadModule('/src/App.jsx'),dashboard=renderToStaticMarkup(React.createElement(App,{initialData:paid}));assert.ok(dashboard.indexOf('debt-overview-title')<dashboard.indexOf('cash-decision-title'))
  const css=await readFile(new URL('../src/product-refinements.css',import.meta.url),'utf8');assert.match(css,/\.debt-change\.increase/);assert.match(css,/\.debt-change\.decrease/)
 }finally{await server.close()}
})
