import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createServer} from 'vite'
import {prepareData,saveLedgerTransaction,saveStatement,statementTotals} from '../src/lib/finance.js'
import {cardStatementAction,contextActionDraft} from '../src/lib/contextActions.js'
import {activityEntries,defaultActivityFilters,filterActivity} from '../src/lib/activity.js'
import {anonymizeDiagnosticData} from '../src/lib/diagnosticExport.js'
import {validateData} from '../src/lib/backup.js'
import {saveBillCharge,editBillPaymentDraft} from '../src/lib/billRecording.js'
import {RELEASE_VERSION} from '../src/release.js'
import {invalidateCheckpoints} from '../src/lib/checkpoints.js'
const now=new Date(2026,9,26,12)
const base=()=>prepareData({accounts:[{id:'bank',name:'Checking',type:'checking',balance:1000},{id:'savings',name:'Savings',type:'savings',balance:200},{id:'card',name:'Card',type:'credit',balance:500}],transactions:[],payments:[],cardStatements:[],bills:[{id:'propane',name:'Propane',amount:20,frequency:'monthly',dueDay:26,nextDueDate:'2026-10-26',accountId:'bank'}],extra:0},now)

test('reconciliation drafts target every account type, preserve state and reject deleted accounts',()=>{
 const data=base(),before=structuredClone(data)
 for(const account of data.accounts){const draft=contextActionDraft(data,{kind:'reconcile',accountId:account.id});assert.equal(draft.mode,'reconcile');assert.equal(draft.form.accountId,account.id);assert.equal(draft.form.balance,account.balance);assert.equal(draft.form.reason,'')}
 assert.deepEqual(data,before);assert.throws(()=>contextActionDraft(data,{kind:'reconcile',accountId:'missing'}),/no longer exists/)
})
test('new statement shortcut selects the card without guessing issuer dates or minimums',()=>{
 const data=base(),action=cardStatementAction(data,data.accounts[2],now),draft=contextActionDraft(data,action)
 assert.equal(action.label,'Add statement');assert.equal(draft.form.cardId,'card');assert.equal(draft.form.dueDate,'');assert.equal(draft.form.minimum,'');assert.equal(draft.form.id,undefined)
 assert.equal(data.cardStatements.length,0)
})
test('review shortcuts use the existing statement and minimum-met status is not an Add action',()=>{
 let data=saveStatement(base(),{cardId:'card',dueDate:'2026-11-14',minimum:25},now),statement=data.cardStatements[0]
 data.cardStatements[0].needsReview=true
 const action=cardStatementAction(data,data.accounts[2],now),review=contextActionDraft(data,action)
 assert.equal(action.label,'Review statement');assert.equal(review.form.id,statement.id);assert.equal(review.form.dueDate,'2026-11-14')
 data.cardStatements[0].needsReview=false
 data.payments=[{id:'paid',cardId:'card',bankId:'bank',date:'2026-10-26',localDate:'2026-10-26',amount:25,assignmentStatus:'confirmed',statementId:statement.id}]
 assert.equal(statementTotals(statement,data.payments,now).remaining,0);assert.equal(cardStatementAction(data,data.accounts[2],now),null)
 const later=saveStatement(data,{cardId:'card',dueDate:'2026-12-14',minimum:30},now)
 assert.equal(cardStatementAction(later,later.accounts[2],now).statementId,later.cardStatements.find(s=>s.dueDate==='2026-12-14').id)
 assert.throws(()=>contextActionDraft(data,{kind:'statement',cardId:'card',statementId:'missing'}),/no longer exists/)
 assert.throws(()=>contextActionDraft(data,{kind:'statement',cardId:'bank'}),/Choose a card/)
})
test('unassigned payments route to card-specific review, not a new statement',()=>{
 const data=saveStatement(base(),{cardId:'card',dueDate:'2026-11-14',minimum:25},now),before=structuredClone(data)
 data.payments=[{id:'unassigned',cardId:'card',bankId:'bank',date:'2026-10-26',amount:25,assignmentStatus:'unassigned'}]
 const action=cardStatementAction(data,data.accounts[2],now);assert.equal(action.kind,'assignments');assert.equal(action.cardId,'card');assert.equal(action.label,'Review payments')
 assert.deepEqual(data.accounts,before.accounts)
})
test('expense descriptions survive save, edit, clear, search and backup without changing categories or extra balances',()=>{
 const data=base(),form={accountId:'bank',merchant:'Example store',amount:20,date:'2026-10-26',category:'Other',subcategory:'Other',description:'  Propane tank refill  '}
 const saved=saveLedgerTransaction(data,form,'purchase',now),entry=saved.transactions[0]
 assert.equal(entry.description,'Propane tank refill');assert.equal(entry.category,'Other');assert.equal(saved.accounts[0].balance,980)
 assert.equal(filterActivity(activityEntries(saved),{...defaultActivityFilters(),search:'PROPANE'}).entries.length,1)
 const edited=saveLedgerTransaction(saved,{...entry,date:'2026-10-26',description:'Grill propane refill'},'purchase',now)
 saved.completedMonths=['2026-10'];edited.completedMonths=['2026-10']
 assert.deepEqual(invalidateCheckpoints(saved,edited).completedMonths,['2026-10'])
 assert.equal(edited.accounts[0].balance,980);assert.equal(edited.transactions[0].description,'Grill propane refill')
 assert.ok(validateData(JSON.parse(JSON.stringify(edited))))
 const cleared=saveLedgerTransaction(edited,{...edited.transactions[0],date:'2026-10-26',description:''},'purchase',now);assert.equal(cleared.transactions[0].description,'');assert.equal(cleared.accounts[0].balance,980)
 assert.throws(()=>saveLedgerTransaction(data,{...form,description:'x'.repeat(501)},'purchase',now),/500 characters/)
 const history=saveLedgerTransaction(data,{...form,historical:true},'purchase',now);assert.equal(history.accounts[0].balance,1000)
})
test('description survives expense-to-bill conversion and bill corrections and is anonymized',()=>{
 const data=saveLedgerTransaction(base(),{accountId:'bank',merchant:'Example store',amount:20,date:'2026-10-26',description:'Propane for Private Person'},'purchase',now),entry=data.transactions[0]
 const converted=saveBillCharge(data,{billId:'propane',dueDate:'2026-10-26',transactionId:entry.id,date:'2026-10-26',bankId:'bank',amount:20},now)
 assert.equal(converted.accounts[0].balance,980);assert.equal(converted.billPayments[0].description,entry.description);assert.equal(converted.transactions.length,0)
 assert.equal(filterActivity(activityEntries(converted),{...defaultActivityFilters(),search:'Propane for Private'}).entries.length,1)
 const draft=editBillPaymentDraft(converted,converted.billPayments[0]),edited=saveBillCharge(converted,draft,now)
 assert.equal(edited.billPayments[0].description,entry.description);assert.equal(edited.accounts[0].balance,980)
 const diagnostic=anonymizeDiagnosticData(edited);assert.ok(!JSON.stringify(diagnostic).includes('Private Person'));assert.match(diagnostic.billPayments[0].description,/Expense description/)
 data.transactions[0].note='Private note';const sanitized=anonymizeDiagnosticData(data);assert.ok(!JSON.stringify(sanitized).includes('Private note'));assert.ok(!JSON.stringify(sanitized).includes('Private Person'))
})
test('context actions, descriptions and inline splash placement render through app pipeline',async()=>{
 let page='accounts'
 const server=await createServer({server:{middlewareMode:true},appType:'custom',plugins:[{name:'context-test-route',enforce:'pre',transform(code,id){if(id.endsWith('/src/App.jsx'))return code.replace("useState('dashboard')",`useState('${page}')`);if(id.endsWith('/src/AccountTiles.jsx'))return code.replace("useState('')","useState('card')")}}]})
 try{
  const {default:Tiles}=await server.ssrLoadModule('/src/AccountTiles.jsx'),tiles=renderToStaticMarkup(React.createElement(Tiles,{accounts:base().accounts,data:base(),onReconcile(){}}));assert.match(tiles,/Reconcile balance for Card/)
  let App=(await server.ssrLoadModule('/src/App.jsx')).default,html=renderToStaticMarkup(React.createElement(App,{initialData:base()}));assert.doesNotMatch(html,/balance-review-panel/);assert.match(html,/Balance checks &amp; adjustment history/)
  page='debts';server.moduleGraph.invalidateAll();App=(await server.ssrLoadModule('/src/App.jsx')).default;html=renderToStaticMarkup(React.createElement(App,{initialData:base()}));assert.match(html,/Add statement for Card/)
  page='transactions';server.moduleGraph.invalidateAll();App=(await server.ssrLoadModule('/src/App.jsx')).default
  const data=saveLedgerTransaction(base(),{accountId:'bank',merchant:'Example store',amount:20,date:'2026-10-26',description:'Propane <refill>'},'purchase',now)
  html=renderToStaticMarkup(React.createElement(App,{initialData:data}));assert.match(html,/Propane &lt;refill&gt;/)
  const {default:CloudScreen}=await server.ssrLoadModule('/src/CloudScreen.jsx'),splash=renderToStaticMarkup(React.createElement(CloudScreen,null,React.createElement('h1',null,'Welcome'),React.createElement('p',null,'Introductory text'),React.createElement('button',null,'Continue')))
  assert.ok(splash.indexOf('Introductory text')<splash.indexOf('cloud-release'));assert.ok(splash.indexOf('cloud-release')<splash.indexOf('Continue'));assert.ok(splash.includes(RELEASE_VERSION));assert.doesNotMatch(splash,/release-badge/)
  const css=await readFile(new URL('../src/product-refinements.css',import.meta.url),'utf8');assert.match(css,/\.cloud-card \.cloud-release\{position:static/)
 }finally{await server.close()}
})
