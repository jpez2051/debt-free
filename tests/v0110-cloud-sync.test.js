import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cloudSafeData, cloudFingerprint } from '../src/lib/cloudSync.js'
import { recordCardPayment, removeStatement } from '../src/lib/finance.js'

test('cloud migration keeps Firebase access private to the signed-in owner', async () => {
  const [rules, client, shell, settings] = await Promise.all([
    readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/firebaseClient.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/CloudApp.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/SettingsCenter.jsx', import.meta.url), 'utf8'),
  ])
  assert.match(rules, /request\.auth\.uid == userId/)
  assert.match(rules, /allow delete: if false/)
  assert.match(client, /signInWithPopup/)
  assert.match(client, /signInWithRedirect/)
  assert.match(client, /'users', uid/)
  assert.match(shell, /Copy my records to the cloud/)
  assert.match(shell, /Start with a blank workspace/)
  assert.match(shell, /There aren’t any local Debt Free records/)
  assert.match(shell, /function startFresh/)
  assert.match(settings, /Backup restored to your private cloud record/)
  assert.match(settings, /\[cloudTick\]/)
  assert.match(settings, /Download anonymized review/)
  assert.match(settings, /hasExportableData/)
})

test('cloud saves omit undefined optional fields without changing payment details', () => {
  const original={payments:[{id:'extra',amount:25,cycleDueDateBefore:undefined}],cardStatements:[{id:'old',supersededBy:undefined}],nested:{keep:null,omit:undefined}}
  const clean=cloudSafeData(original)
  assert.deepEqual(clean,{payments:[{id:'extra',amount:25}],cardStatements:[{id:'old'}],nested:{keep:null}})
  assert.equal(original.payments[0].amount,25)
  assert.equal(cloudFingerprint(original),cloudFingerprint(clean))
  assert.throws(()=>cloudSafeData({payments:[undefined]}),/empty list item/)
})

test('unassigned and extra payments and removed statement links never create undefined fields', () => {
  const now=new Date(2026,8,24,12)
  const base={financeVersion:1,accounts:[{id:'card',name:'Card',type:'credit',balance:500,minimum:50,nextDueDate:'2026-09-27'},{id:'bank',name:'Checking',type:'checking',balance:1000}],cardStatements:[{id:'sep',cardId:'card',dueDate:'2026-09-27',minimum:50},{id:'oct',cardId:'card',dueDate:'2026-10-27',minimum:40,supersededBy:'nov'},{id:'nov',cardId:'card',dueDate:'2026-11-27',minimum:30}],payments:[],transactions:[],bills:[]}
  const form={cardId:'card',bankId:'bank',amount:25,date:'2026-09-24'}
  const extra=recordCardPayment(base,{...form,paymentIntent:'extra'},now)
  assert.equal(Object.hasOwn(extra.payments[0],'cycleDueDateBefore'),false)
  assert.equal(extra.accounts.find(account=>account.id==='bank').balance,975)
  const assigned=recordCardPayment(extra,{...form,statementId:'sep'},now)
  assert.equal(assigned.payments[0].cycleDueDateBefore,'2026-09-27')
  assert.equal(assigned.accounts.find(account=>account.id==='bank').balance,950)
  const removed=removeStatement(assigned,'nov',now)
  assert.equal(Object.hasOwn(removed.cardStatements.find(statement=>statement.id==='oct'),'supersededBy'),false)
  assert.deepEqual(cloudSafeData(removed),removed)
})
