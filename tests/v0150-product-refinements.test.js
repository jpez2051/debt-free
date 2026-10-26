import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createServer} from 'vite'
import {prepareData,saveLedgerTransaction,recordRefund,recordCardPayment,recordBillPayment} from '../src/lib/finance.js'
import {openingBalanceKey,openingBalanceConflicts} from '../src/lib/openingBalanceGuard.js'
import {cashPosition} from '../src/lib/cashPosition.js'
import {accountBalances} from '../src/lib/accountBalances.js'
import {clearPending} from '../src/lib/clearPending.js'
import {filterByReportingPeriod} from '../src/lib/reporting.js'
import {categoryColor,creditScorePoints} from '../src/lib/chartPresentation.js'
import {navigationSnapshot,publishNavigation,subscribeNavigation,navigationGroupForPage} from '../src/lib/navigation.js'
import {RELEASE_VERSION} from '../src/release.js'
import viteConfig from '../vite.config.js'

const now=new Date(2026,9,23,12)
const base=()=>prepareData({accounts:[{id:'bank',name:'Checking',type:'checking',balance:1000,openingDate:'2026-10-01'},{id:'other',name:'Savings',type:'savings',balance:200,openingDate:'2026-10-10'},{id:'card',name:'Card',type:'credit',balance:0,limit:1000,openingDate:'2026-10-01'}],transactions:[],payments:[],bills:[{id:'bill',name:'Phone',accountId:'bank',amount:10,frequency:'monthly',nextDueDate:'2026-10-25',dueDay:25}],extra:500},now)
const expense={date:'2026-09-20',accountId:'bank',merchant:'Store',amount:20}

test('pre-opening activity requires an explicit choice and rejected saves are atomic',()=>{
 const data=base(),before=structuredClone(data)
 assert.throws(()=>saveLedgerTransaction(data,expense,'purchase',now),/opening balance/)
 assert.deepEqual(data,before)
 const history=saveLedgerTransaction(data,{...expense,historical:true},'purchase',now);assert.equal(history.accounts[0].balance,1000)
 const confirmed={...expense,openingBalanceConfirmation:openingBalanceKey(data,expense)}
 const changed=saveLedgerTransaction(data,confirmed,'purchase',now);assert.equal(changed.accounts[0].balance,980)
 assert.throws(()=>saveLedgerTransaction(data,{...confirmed,date:'2026-09-21'},'purchase',now),/opening balance/)
 assert.throws(()=>saveLedgerTransaction(data,{...confirmed,accountId:'other'},'purchase',now),/opening balance/)
 assert.equal(openingBalanceConflicts(data,{...expense,date:'2026-10-01'}).length,0)
})
test('opening-balance choice also protects deposits, refunds, payments and internal transfers',()=>{
 const data=base(),payment={date:expense.date,bankId:'bank',cardId:'card',amount:20},bill={date:expense.date,bankId:'bank',billId:'bill',dueDate:'2026-09-25',amount:10}
 for(const [fn,form]of [[(d,f)=>saveLedgerTransaction(d,f,'income',now),expense],[(d,f)=>recordRefund(d,f,now),expense],[(d,f)=>recordCardPayment(d,f,now),payment],[(d,f)=>recordBillPayment(d,f,now),bill]]){
  assert.throws(()=>fn(data,form),/opening balance/)
  const next=fn(data,{...form,openingBalanceConfirmation:openingBalanceKey(data,form)});assert.ok(next)
 }
 const transfer={...expense,toAccountId:'other',transferPurpose:'Savings contribution'}
 assert.equal(openingBalanceConflicts(data,transfer).length,2)
 const next=saveLedgerTransaction(data,{...transfer,openingBalanceConfirmation:openingBalanceKey(data,transfer)},'transfer',now)
 assert.equal(next.accounts[0].balance,980);assert.equal(next.accounts[1].balance,220)
})
test('opening guard does not rewrite existing history; pending entries clear exactly once',()=>{
 const data=base(),form={...expense,status:'pending',openingBalanceConfirmation:openingBalanceKey(data,expense)}
 const pending=saveLedgerTransaction(data,form,'purchase',now);assert.equal(pending.accounts[0].balance,1000)
 assert.equal(accountBalances(pending,'bank').pendingOut,20)
 const cleared=clearPending(pending,'transaction',pending.transactions[0].id,now);assert.equal(cleared.accounts[0].balance,980)
 assert.throws(()=>clearPending(cleared,'transaction',pending.transactions[0].id,now))
 assert.equal(data.transactions.length,0)
})
test('cash components reconcile including pending withdrawals and unpaid bills',()=>{
 const pending=saveLedgerTransaction(base(),{...expense,date:'2026-10-23',status:'pending',amount:100},'purchase',now),position=cashPosition(pending,now)
 assert.equal(position.checking,1000);assert.equal(position.pendingOut,100)
 assert.equal(position.afterKnownDues,position.checking-position.pendingOut-position.cardMinimums-position.cashBills)
 assert.equal(position.afterKnownDues,890)
})
test('calendar-month reports handle leap days, year boundaries and exclude future data',()=>{
 const data=['2024-02-01','2024-02-29','2024-03-01','2025-12-31','2026-01-01','2026-10-24'].map(date=>({localDate:date,id:date}))
 assert.deepEqual(filterByReportingPeriod(data,'2024-02',now).map(e=>e.id),['2024-02-01','2024-02-29'])
 assert.deepEqual(filterByReportingPeriod(data,'2025-12',now).map(e=>e.id),['2025-12-31'])
 assert.deepEqual(filterByReportingPeriod(data,'2026-01',now).map(e=>e.id),['2026-01-01'])
 assert.equal(filterByReportingPeriod(data,'2026-11',now).length,0)
 assert.equal(filterByReportingPeriod(data,'2026-10',now).length,0)
})
test('score point spacing uses elapsed days and category colors do not depend on rank',()=>{
 const points=creditScorePoints([{date:'2026-10-01',score:600},{date:'2026-10-02',score:610},{date:'2026-10-31',score:620}],300,850)
 assert.equal(points[0].x,6);assert.equal(points[2].x,94);assert.ok(points[1].x<10)
 assert.equal(creditScorePoints([{date:'2026-10-01',score:600},{date:'2026-10-01',score:610}],300,850)[1].x,50)
 assert.equal(categoryColor('Food & Drink'),categoryColor('Food & Drink'));assert.notEqual(categoryColor('Food & Drink'),categoryColor('Subscriptions'))
})
test('navigation responds to a workspace appearing after sign-in and resets on sign-out',()=>{
 publishNavigation('dashboard',false);let events=0;const unsubscribe=subscribeNavigation(()=>events++)
 publishNavigation('bills',true);assert.deepEqual(navigationSnapshot(),{page:'bills',ready:true});assert.equal(navigationGroupForPage('bills'),'money')
 publishNavigation('payoff',true);assert.equal(navigationGroupForPage(navigationSnapshot().page),'plan')
 publishNavigation('dashboard',false);assert.equal(navigationSnapshot().ready,false);assert.equal(events,3)
 unsubscribe();publishNavigation('dashboard',false);assert.equal(events,3)
})
test('pre-JavaScript splash uses the same package version as Settings',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),built=viteConfig.plugins[0].transformIndexHtml(html)
 assert.match(built,new RegExp(`Opening your financial workspace…</small><p>v${RELEASE_VERSION.replaceAll('.','\\.')}`));assert.ok(!built.includes('__DEBT_FREE_VERSION__'))
 const settings=await readFile(new URL('../src/SettingsCenter.jsx',import.meta.url),'utf8');assert.match(settings,/RELEASE_VERSION/)
})
test('refined components render pending money, explicit payoff apply, optional history and version',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'})
 try{
  const load=async path=>(await server.ssrLoadModule('/src/'+path)).default
  const Extra=await load('PayoffExtraEditor.jsx'),extraModule=await server.ssrLoadModule('/src/PayoffExtraEditor.jsx')
  let saves=0;const extra=renderToStaticMarkup(React.createElement(Extra,{value:500,onSave(){saves++}}));assert.match(extra,/Set \$50/);assert.doesNotMatch(extra,/>\+\$50/);assert.match(extra,/Apply monthly extra/);assert.equal(saves,0)
  for(const bad of ['','-1','1.001','Infinity','bad'])assert.throws(()=>extraModule.extraPaymentValue(bad))
  assert.equal(extraModule.extraPaymentValue('0'),0);assert.equal(extraModule.extraPaymentValue('500.25'),500.25)
  const source=await readFile(new URL('../src/PayoffExtraEditor.jsx',import.meta.url),'utf8'),line=source.split('\n').find(l=>l.trim().startsWith('const apply='))
  let release;const pending=new Promise(resolve=>release=resolve),saving={current:false},save=()=>{saves++;return true};save.protection=pending
  const apply=Function('saving','setBusy','draft','extraPaymentValue','onSave','setDirty','setStatus','setError',`${line};return apply`)(saving,()=>{},'50',extraModule.extraPaymentValue,save,()=>{},()=>{},e=>assert.fail(e))
  apply();apply();assert.equal(saves,1);release();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(saving.current,false)
  const failures=[],dirtyChanges=[],failedSaving={current:false}
  const failed=Function('saving','setBusy','draft','extraPaymentValue','onSave','setDirty','setStatus','setError',`${line};return apply`)(failedSaving,()=>{},'50',extraModule.extraPaymentValue,()=>false,v=>dirtyChanges.push(v),()=>assert.fail('not saved'),e=>failures.push(e))
  failed();assert.equal(failedSaving.current,false);assert.equal(dirtyChanges.length,0);assert.match(failures[0],/Could not save/)
  const offlineSave=()=>{offlineSave.protection=Promise.reject(Error('Device protection failed'));return true},offlineSaving={current:false}
  const offline=Function('saving','setBusy','draft','extraPaymentValue','onSave','setDirty','setStatus','setError',`${line};return apply`)(offlineSaving,()=>{},'50',extraModule.extraPaymentValue,offlineSave,v=>dirtyChanges.push(v),()=>assert.fail('not protected'),e=>failures.push(e))
  offline();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(offlineSaving.current,false);assert.equal(dirtyChanges.length,0);assert.equal(failures.at(-1),'Device protection failed')
  const CloudScreen=await load('CloudScreen.jsx');assert.match(renderToStaticMarkup(React.createElement(CloudScreen,null,'Loading')),new RegExp(`v${RELEASE_VERSION.replaceAll('.','\\.')}`))
  const Notice=await load('OpeningBalanceNotice.jsx');assert.match(renderToStaticMarkup(React.createElement(Notice,{data:base(),form:expense,onChange(){}})),/Already included/)
  const Nav=await load('AdaptiveNav.jsx');assert.equal(renderToStaticMarkup(React.createElement(Nav)),'')
  const pendingCard=saveLedgerTransaction(base(),{...expense,date:'2026-10-23',accountId:'card',amount:200,status:'pending'},'purchase',now)
  const Tiles=await load('AccountTiles.jsx'),tiles=renderToStaticMarkup(React.createElement(Tiles,{accounts:pendingCard.accounts,data:pendingCard}));assert.match(tiles,/Pending charges: \$200\.00/)
  const credit=structuredClone(pendingCard);credit.accounts.find(a=>a.id==='card').balance=-300
  assert.match(renderToStaticMarkup(React.createElement(Tiles,{accounts:credit.accounts,data:credit})),/Including pending: \$100\.00 credit/)
  const Decision=await load('CashDecision.jsx'),decision=renderToStaticMarkup(React.createElement(Decision,{data:base(),position:cashPosition(base(),now),update(){}}));assert.match(decision,/Pending withdrawals/)
  const Picker=await load('PeriodPicker.jsx');assert.match(renderToStaticMarkup(React.createElement(Picker,{value:'2024-02',onChange(){}})),/value="2024-02"/)
 }finally{await server.close()}
})
