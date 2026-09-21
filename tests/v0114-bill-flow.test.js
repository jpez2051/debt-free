import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { prepareData, recordBillPayment, cycleTotals, reassignPayment } from '../src/lib/finance.js'

const now=new Date(2026,8,21,12)
const source=()=>prepareData({financeVersion:1,accounts:[{id:'bank',name:'Checking',type:'checking',balance:100}],transactions:[],payments:[],bills:[{id:'music',name:'Music',amount:10,dueDay:6,nextDueDate:'2026-10-06',frequency:'monthly',active:true,accountId:'bank'}],billPayments:[],creditScores:[],cardStatements:[],billCycles:[{id:'sep',billId:'music',dueDate:'2026-09-06',expectedAmount:10,actualAmount:null},{id:'oct',billId:'music',dueDate:'2026-10-06',expectedAmount:10,actualAmount:null}],adjustments:[],extra:0},now)

test('a recurring charge can confirm a changed invoice total without turning a partial payment into a paid bill',()=>{
  const paid=recordBillPayment(source(),{cycleId:'sep',bankId:'bank',date:'2026-09-08',amount:12,confirmActual:true,actualAmount:12},now)
  const cycle=paid.billCycles.find(c=>c.id==='sep')
  assert.equal(cycle.actualAmount,12)
  assert.deepEqual(cycleTotals(cycle,paid.billPayments,now),{required:12,actualPaid:12,paid:12,remaining:0})
  assert.equal(paid.accounts[0].balance,88)
})

test('a recorded charge can be moved to its correct bill occurrence without changing its balance effect',()=>{
  const paid=recordBillPayment(source(),{cycleId:'oct',bankId:'bank',date:'2026-09-08',amount:10},now)
  const moved=reassignPayment(paid,paid.billPayments[0].id,'sep','bill',now)
  assert.equal(moved.billPayments[0].cycleId,'sep')
  assert.equal(moved.accounts[0].balance,90)
})

test('Bills has one primary entry flow and keeps corrections in collapsed history',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/Mark charged/)
  assert.match(app,/Mark paid/)
  assert.match(app,/Charge & payment history/)
  assert.match(app,/Correct bill occurrence/)
  assert.match(app,/Change bill month or invoice amount/)
  assert.match(app,/openBillPayment\(b,obligation\?\.cycleId\)/)
})
