import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import config from '../vite.config.js'
import { cardMinimumObligation } from '../src/lib/obligations.js'

const now=new Date(2026,7,27,12)
const card={id:'card',name:'Visa',balance:1000,minimum:50,nextDueDate:'2026-09-15'}
const payment=amount=>({cardId:'card',amount,date:'2026-08-26T12:00:00Z',cycleDueDateBefore:'2026-09-15'})

for(const [amount,remaining] of [[0,50],[30,20],[50,0],[100,0]]){
  test(`a $${amount} payment shows its real total and leaves $${remaining} due`,()=>{
    const result=cardMinimumObligation(card,amount?[payment(amount)]:[],now)
    assert.equal(result.actualPaid,amount)
    assert.equal(result.remaining,remaining)
    assert.equal(result.paid,Math.min(amount,50))
  })
}

test('completed cycle totals include partial and extra payments but not another cycle or card',()=>{
  const entries=[payment(30),{...payment(70),cycleAdvanced:true}, {...payment(500),cycleDueDateBefore:'2026-10-15'}, {...payment(900),cardId:'other'}, {...payment(200),date:'2026-08-30T12:00:00Z'}]
  const result=cardMinimumObligation({...card,nextDueDate:'2026-10-15'},entries,now)
  assert.equal(result.actualPaid,100)
  assert.equal(result.remaining,0)
  assert.equal(result.paid,50)
})

test('legacy payments without cycle metadata retain their actual amount',()=>{
  const result=cardMinimumObligation(card,[{...payment(100),cycleDueDateBefore:undefined}],now)
  assert.equal(result.actualPaid,100)
  assert.equal(result.remaining,0)
})

test('complete release pipeline renders minimum met with actual payment detail',async()=>{
  const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  const output=config.plugins[0].transform(source,'/src/App.jsx')
  const summary=await readFile(new URL('../src/UpcomingSummary.jsx',import.meta.url),'utf8')
  assert.match(output,/<UpcomingSummary data=\{data\}/)
  assert.match(summary,/Minimum met ✓/)
  assert.match(summary,/money\.format\(item\.remaining\)\} due/)
  assert.match(summary,/item\.actualPaid/)
  assert.match(output,/const VERSION='0\.9\.4'/)
})
