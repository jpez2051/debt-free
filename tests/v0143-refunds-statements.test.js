import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { prepareData, saveStatement, removeStatement, recordRefund, localDate } from '../src/lib/finance.js'
import { closingDateForDue } from '../src/lib/statementDates.js'
import { entryPreview } from '../src/lib/entryPreview.js'
import { validateData } from '../src/lib/backup.js'
const now=new Date(2026,9,22,12)
const base=()=>prepareData({accounts:[{id:'bank',name:'Checking',type:'checking',balance:500},{id:'card',name:'Card',type:'credit',balance:900,minimum:25,nextDueDate:'2026-10-20',statementDate:'2026-09-25'}],cardStatements:[{id:'oct',cardId:'card',dueDate:'2026-10-20',closingDate:'2026-09-25',minimum:25,needsReview:false}],transactions:[],payments:[],bills:[],extra:0},now)
test('November due date can correctly use October closing date, saved per statement',()=>{
 const source=base(),next=saveStatement(source,{cardId:'card',dueDate:'2026-11-20',closingDate:'2026-10-25',minimum:30,issuerConfirmed:true},now)
 const card=next.accounts.find(a=>a.id==='card');assert.equal(card.statementDate,'2026-10-25');assert.equal(closingDateForDue(next,card),'2026-10-25');assert.equal(closingDateForDue(next,card,'2026-10-20'),'2026-09-25');assert.equal(source.accounts[1].statementDate,'2026-09-25');assert.equal(next.accounts[1].balance,900);assert.ok(validateData(next))
})
test('new statement without closing date never carries forward a stale account date',()=>{
 const next=saveStatement(base(),{cardId:'card',dueDate:'2026-11-20',minimum:30},now),card=next.accounts[1]
 assert.equal(card.statementDate,'');assert.equal(closingDateForDue(next,card),'');assert.equal(next.cardStatements.find(s=>s.id==='oct').closingDate,'2026-09-25')
 const legacy=base();delete legacy.cardStatements[0].closingDate;assert.equal(closingDateForDue(legacy,legacy.accounts[1]),'')
})
test('historical statement additions do not replace current dates; removing latest restores prior dates',()=>{
 const november=saveStatement(base(),{cardId:'card',dueDate:'2026-11-20',closingDate:'2026-10-25',minimum:30},now)
 const old=saveStatement(november,{cardId:'card',dueDate:'2026-09-20',closingDate:'2026-08-25',minimum:20},now)
 assert.equal(old.accounts[1].statementDate,'2026-10-25')
 const removed=removeStatement(old,old.cardStatements.find(s=>s.dueDate==='2026-11-20').id,now);assert.equal(removed.accounts[1].statementDate,'2026-09-25')
})
test('closing dates are validated and existing same-statement edits preserve them',()=>{
 const source=base(),form={cardId:'card',dueDate:'2026-11-20',minimum:30}
 for(const closingDate of ['2026-11-20','2026-11-21','2026-02-30','n/a'])assert.throws(()=>saveStatement(source,{...form,closingDate},now),/closing date/)
 const edited=saveStatement(source,{id:'oct',cardId:'card',dueDate:'2026-10-20',minimum:27},now);assert.equal(edited.cardStatements[0].closingDate,'2026-09-25')
 const moved=saveStatement(source,{id:'oct',cardId:'card',dueDate:'2026-11-20',minimum:27},now);assert.equal(moved.cardStatements[0].closingDate,'')
 const bad=base();bad.cardStatements[0].closingDate='2026-12-01';assert.equal(validateData(bad),false)
 assert.ok(validateData(JSON.parse(JSON.stringify(edited))))
})
test('refund previews match actual posting on cash, credit, historical and pending records',()=>{
 const source=base(),form={date:'2026-10-22',accountId:'bank',merchant:'Returned item',amount:20,category:'Shopping & Personal'}
 assert.equal(entryPreview(source,form,'refund').changes[0].after,520)
 assert.equal(entryPreview(source,{...form,accountId:'card'},'refund').changes[0].after,880)
 assert.equal(entryPreview(source,{...form,historical:true},'refund').changes.length,0)
 assert.equal(entryPreview(source,{...form,status:'pending'},'refund').changes.length,0)
 const next=recordRefund(source,form,now),edited=entryPreview(next,{...next.transactions[0],date:'2026-10-22',amount:25},'refund');assert.equal(edited.changes[0].after,525);assert.equal(source.accounts[0].balance,500)
})
test('global refund save handler posts once and retains form when save is rejected',async()=>{
 const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),line=source.split('\n').find(l=>l.startsWith(' const saveRefund='))
 const data=base(),form={date:'2026-10-22',accountId:'bank',merchant:'Return',amount:20},events=[]
 const handler=Function('data','form','recordRefund','update','action','setModal','setForm',`${line};return saveRefund`)(data,form,(d,f)=>recordRefund(d,f,now),next=>{events.push(next);return true},fn=>fn(),value=>events.push(value),value=>events.push(value))
 handler({preventDefault(){}});assert.equal(events[0].accounts[0].balance,520);assert.equal(events[0].transactions[0].kind,'refund');assert.equal(events[1],null)
 const rejected=Function('data','form','recordRefund','update','action','setModal','setForm',`${line};return saveRefund`)(data,form,(d,f)=>recordRefund(d,f,now),()=>false,fn=>fn(),()=>assert.fail('must keep form'),()=>assert.fail('must keep draft'));rejected({preventDefault(){}})
})
test('refund entry and statement closing dates render through application pipeline',async()=>{
 let page='dashboard',modal='refund'
 const server=await createServer({server:{middlewareMode:true},appType:'custom',plugins:[{name:'refund-test-route',enforce:'pre',transform(code,id){if(id.endsWith('/src/App.jsx'))return code.replace("useState('dashboard')",`useState('${page}')`).replace('[modal,setModal]=useState(null)',`[modal,setModal]=useState(${modal?JSON.stringify(modal):'null'})`).replace('[form,setForm]=useState({})',`[form,setForm]=useState({date:'${localDate()}',accountId:'bank',amount:20,merchant:'Return'})`)}}]})
 try{
  let App=(await server.ssrLoadModule('/src/App.jsx')).default
  const html=renderToStaticMarkup(React.createElement(App,{initialData:base()}));assert.match(html,/Log refund/);assert.match(html,/Original expense \(optional\)/);assert.match(html,/Already included in my current balance/);assert.match(html,/\$520\.00/)
  page='debts';modal=null;server.moduleGraph.invalidateAll();App=(await server.ssrLoadModule('/src/App.jsx')).default
  const nov=saveStatement(base(),{cardId:'card',dueDate:'2026-11-20',minimum:30},now),debt=renderToStaticMarkup(React.createElement(App,{initialData:nov}));assert.doesNotMatch(debt,/Closing date <b>|Closing date not recorded|Not recorded/)
  page='dashboard';modal='quickAdd';server.moduleGraph.invalidateAll();App=(await server.ssrLoadModule('/src/App.jsx')).default
  const phone=renderToStaticMarkup(React.createElement(App,{initialData:base()}));assert.match(phone,/quick-add-actions[\s\S]*>Refund<\/button>/)
 }finally{await server.close()}
})
