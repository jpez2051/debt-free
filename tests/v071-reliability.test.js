import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateData } from '../src/lib/backup.js'

test('v0.7.1 protects linked bill records and preserves negative shortfalls',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/safeToSpend=cash-remainingBills-remainingMinimums/)
  assert.match(app,/billPayments\|\|\[\]\)\.filter\(p=>p\.bankId===a\.id\)/)
  assert.match(app,/historical payment record\(s\).*Archive it instead/)
  assert.match(app,/obligation\?\.remaining\|\|b\.amount/)
  assert.match(app,/confirmOutflow/)
})

test('backup validation accepts negative cash balances but rejects broken references',()=>{
  const valid={accounts:[{id:'bank',name:'Checking',balance:-10},{id:'card',name:'Card',balance:100}],transactions:[],payments:[],bills:[{id:'rent',name:'Rent',amount:50,accountId:'bank'}],billPayments:[{id:'paid',billId:'rent',bankId:'bank',amount:50,date:'2026-08-25'}],creditScores:[]}
  assert.equal(validateData(valid),true)
  assert.equal(validateData({...valid,billPayments:[{...valid.billPayments[0],bankId:'missing'}]}),false)
  assert.equal(validateData({...valid,transactions:[{id:'bad',accountId:'missing',amount:5,date:'2026-08-25'}]}),false)
})

test('v0.7.1 transform uses device-local dates and honest empty states',async()=>{
  const transform=await readFile(new URL('../scripts/v071-app-transform.js',import.meta.url),'utf8')
  assert.match(transform,/now\.getFullYear\(\)/)
  assert.match(transform,/Cash shortfall/)
  assert.match(transform,/cards\.length\?String\(plan\.months\)/)
  assert.match(transform,/card overdraft warning/)
})
