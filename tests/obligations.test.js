import test from 'node:test'
import assert from 'node:assert/strict'
import { billObligation, cardMinimumObligation, upcomingDueDate, upcomingObligations } from '../src/lib/obligations.js'

const now=new Date(2026,7,25,12)
const card={id:'visa',name:'Visa',type:'credit',balance:1200,minimum:110,dueDay:18}

test('upcoming due date advances after this month due day',()=>{
  assert.equal(upcomingDueDate(18,now).toISOString().slice(0,10),'2026-09-18')
  assert.equal(upcomingDueDate(25,now).toISOString().slice(0,10),'2026-08-25')
})

test('card minimum tracks partial payments in the current due cycle',()=>{
  const payments=[
    {cardId:'visa',amount:40,date:'2026-08-20T12:00:00.000Z'},
    {cardId:'visa',amount:90,date:'2026-08-18T12:00:00.000Z'},
    {cardId:'visa',amount:30,date:'2026-08-27T12:00:00.000Z'},
  ]
  const item=cardMinimumObligation(card,payments,now)
  assert.equal(item.required,110)
  assert.equal(item.paid,40)
  assert.equal(item.remaining,70)
})

test('card minimum becomes paid without over-crediting the cycle',()=>{
  const item=cardMinimumObligation(card,[{cardId:'visa',amount:150,date:'2026-08-21T12:00:00.000Z'}],now)
  assert.equal(item.paid,110)
  assert.equal(item.remaining,0)
})

test('an explicit next due date stays overdue until its minimum is completed',()=>{
  const item=cardMinimumObligation({...card,nextDueDate:'2026-08-18'},[{cardId:'visa',amount:50,date:'2026-08-10T12:00:00.000Z'}],now)
  assert.equal(item.dueDate.toISOString().slice(0,10),'2026-08-18')
  assert.equal(item.remaining,60)
})

test('a completed minimum remains visibly paid until its due date passes',()=>{
  const payment={cardId:'visa',amount:110,date:'2026-08-25T12:00:00.000Z',cycleAdvanced:true,cycleDueDateBefore:'2026-09-18'}
  const item=cardMinimumObligation({...card,nextDueDate:'2026-10-18'},[payment],now)
  assert.equal(item.dueDate.toISOString().slice(0,10),'2026-09-18')
  assert.equal(item.paid,110)
  assert.equal(item.remaining,0)
})

test('bills and every card minimum are combined in due-date order',()=>{
  const items=upcomingObligations({cards:[card,{...card,id:'mc',name:'Mastercard',dueDay:8,minimum:55}],bills:[{id:'rent',name:'Rent',amount:900,dueDay:1,accountId:'checking',active:true}],payments:[],accounts:[{id:'checking',name:'Checking'}],now})
  assert.deepEqual(items.map(x=>x.name),['Rent','Mastercard minimum','Visa minimum'])
  assert.equal(items.filter(x=>x.kind==='card').length,2)
})

test('bill obligations track partial and complete payments for the current cycle',()=>{
  const bill={id:'rent',name:'Rent',amount:900,dueDay:1}
  const partial=billObligation(bill,[{billId:'rent',amount:400,date:'2026-08-20T12:00:00.000Z'}],'Checking',now)
  assert.equal(partial.paid,400)
  assert.equal(partial.remaining,500)
  const paid=billObligation(bill,[{billId:'rent',amount:950,date:'2026-08-20T12:00:00.000Z'}],'Checking',now)
  assert.equal(paid.paid,900)
  assert.equal(paid.remaining,0)
})
