import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateData } from '../src/lib/backup.js'

test('v0.7.1 protects linked bill records and preserves negative shortfalls',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/safeToSpend=cashAfterObligations\(data\)/)
  assert.match(app,/trackedObligations\(data\)/)
  assert.match(app,/historical payment record\(s\).*Archive it instead/)
  assert.match(app,/cycleTotals\(cycle,data\.billPayments\)\.remaining/)
  assert.match(app,/saveLedgerTransaction/)
})

test('backup validation accepts negative cash balances but rejects broken references',()=>{
  const valid={accounts:[{id:'bank',name:'Checking',balance:-10},{id:'card',name:'Card',balance:100}],transactions:[],payments:[],bills:[{id:'rent',name:'Rent',amount:50,accountId:'bank'}],billPayments:[{id:'paid',billId:'rent',bankId:'bank',amount:50,date:'2026-08-25'}],creditScores:[]}
  assert.equal(validateData(valid),true)
  assert.equal(validateData({...valid,billPayments:[{...valid.billPayments[0],bankId:'missing'}]}),false)
  assert.equal(validateData({...valid,transactions:[{id:'bad',accountId:'missing',amount:5,date:'2026-08-25'}]}),false)
})

test('the direct source uses device-local dates and honest empty states',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/dateValue\(\)/)
  assert.match(app,/cashAfterObligations/)
  assert.match(app,/cards\.length\?String\(plan\.months\)/)
  assert.match(app,/confirmOutflow/)
})
