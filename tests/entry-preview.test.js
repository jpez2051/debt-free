import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareData } from '../src/lib/finance.js'
import { entryPreview } from '../src/lib/entryPreview.js'
const data=()=>prepareData({accounts:[{id:'bank',name:'Checking',type:'checking',balance:1000},{id:'saving',name:'Savings',type:'savings',balance:200},{id:'card',name:'Card',type:'credit',balance:5000,minimum:50}],transactions:[],payments:[],bills:[]})
test('entry previews use actual posting rules for historical entries, transfers, and card payments',()=>{
  const source=data(),before=structuredClone(source),date='2026-10-01'
  assert.equal(entryPreview(source,{accountId:'bank',amount:20,merchant:'Store',date,historical:true},'purchase').changes.length,0)
  assert.deepEqual(entryPreview(source,{accountId:'bank',toAccountId:'saving',amount:20,merchant:'Savings',date,historical:false,transferPurpose:'Account transfer'},'transfer').changes.map(a=>a.after),[980,220])
  assert.deepEqual(entryPreview(source,{bankId:'bank',cardId:'card',amount:500,date,historical:false,paymentIntent:'extra'},'payment').changes.map(a=>a.after),[500,4500])
  assert.deepEqual(source,before)
})
test('incomplete or invalid entries do not claim a balance result',()=>{
  assert.equal(entryPreview(data(),{amount:'',accountId:'bank'},'purchase'),null)
  assert.equal(entryPreview(data(),{amount:20,accountId:'missing',date:'2026-10-01'},'purchase'),null)
})
