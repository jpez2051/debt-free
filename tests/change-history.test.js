import test from 'node:test'
import assert from 'node:assert/strict'
import { recordChange } from '../src/lib/changeHistory.js'
import { anonymizeDiagnosticData } from '../src/lib/diagnosticExport.js'
const data={accounts:[{id:'b',name:'Private Bank',type:'checking',balance:100}],transactions:[],payments:[],bills:[]}
test('change history records edits and their balance effects without retaining merchant/account names',()=>{
 const next=recordChange(data,{...data,accounts:[{...data.accounts[0],balance:90}],transactions:[{id:'tx',accountId:'b',merchant:'Secret Merchant',amount:10,kind:'purchase',date:'2026-10-12T12:00:00Z'}]})
 assert.equal(next.changeHistory.length,1);assert.equal(next.changeHistory[0].balances[0].delta,-10);assert.ok(next.changeHistory[0].records.some(x=>x.operation==='added'&&x.id==='tx'));assert.ok(!JSON.stringify(next.changeHistory).includes('Secret Merchant'));assert.ok(!JSON.stringify(anonymizeDiagnosticData(next)).includes('Private Bank'))
 const undo=recordChange(next,data,'Undid latest change');assert.equal(undo.changeHistory.length,2);assert.equal(undo.accounts[0].balance,100);assert.equal(undo.changeHistory[1].balances[0].delta,10)
})
test('no-op saves do not add history',()=>assert.deepEqual(recordChange(data,structuredClone(data)),data))
