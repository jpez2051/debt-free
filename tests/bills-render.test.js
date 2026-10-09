import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { prepareData, recordBillPayment } from '../src/lib/finance.js'
import { createBillPaymentDraft, editBillPaymentDraft } from '../src/lib/billRecording.js'

test('Bills presents paid month, corrections and balance preview from real payment records',async()=>{
  const now=new Date(2026,9,9,12),base=prepareData({accounts:[{id:'bank',name:'Checking',type:'checking',balance:100}],transactions:[],payments:[],bills:[{id:'bill',name:'Subscription',amount:3,frequency:'monthly',dueDay:6,nextDueDate:'2026-11-06',active:true,accountId:'bank'}],billCycles:[{id:'oct',billId:'bill',dueDate:'2026-10-06',expectedAmount:3,actualAmount:null}],extra:0},now)
  const data=recordBillPayment(base,{cycleId:'oct',bankId:'bank',date:'2026-10-08',amount:3},now),before=structuredClone(data)
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:BillsPage,BillUndoDialog}=await server.ssrLoadModule('/src/BillsPage.jsx')
    const {default:BillPaymentDialog}=await server.ssrLoadModule('/src/BillPaymentDialog.jsx')
    const {default:ActivityList}=await server.ssrLoadModule('/src/ActivityList.jsx')
    const html=renderToStaticMarkup(React.createElement(BillsPage,{data,now}))
    assert.match(html,/October 2026/);assert.match(html,/>Paid</);assert.match(html,/Paid \$3\.00 on Oct 8, 2026/)
    assert.match(html,/>Edit</);assert.match(html,/>Undo</)
    assert.match(html,/<details class="bill-card"><summary class="bill-card-summary">/)
    assert.doesNotMatch(html,/<details class="bill-card"[^>]*\bopen\b/)
    assert.match(html,/<\/summary><div class="bill-card-content">/)
    assert.doesNotMatch(html,/Bill occurrences|Change occurrence|Review bill-payment allocations/)
    const dialog=renderToStaticMarkup(React.createElement(BillPaymentDialog,{data,now,initial:editBillPaymentDraft(data,data.billPayments[0])}))
    assert.match(dialog,/Bill month/);assert.match(dialog,/type="month" value="2026-10"/)
    assert.match(dialog,/Your account balances stay the same/)
    assert.match(dialog,/Undo this recorded charge/)
    const undo=renderToStaticMarkup(React.createElement(BillUndoDialog,{data,payment:data.billPayments[0]}))
    assert.match(undo,/Balance after Undo/)
    assert.match(undo,/\$97\.00.*\$100\.00/)
    assert.match(undo,/does not cancel a payment/)
    const currentDraft=createBillPaymentDraft(data,data.bills[0],'oct',now)
    assert.equal(currentDraft.cycleId,'oct')
    const activity=renderToStaticMarkup(React.createElement(ActivityList,{data,renderTransaction:()=>null,onEditBillPayment(){},onUndoBillPayment(){}}))
    assert.match(activity,/>Edit</);assert.match(activity,/>Undo</)
    assert.doesNotMatch(activity,/View in Bills/)
    assert.deepEqual(data,before)
  }finally{await server.close()}
})
