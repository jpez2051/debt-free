import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.14 spending supports category and merchant breakdowns', async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/function SpendingBreakdown/)
  assert.match(app,/value="category">Category/)
  assert.match(app,/value="merchant">Merchant/)
  assert.match(app,/Highest spend/)
  assert.match(app,/Most recent/)
  assert.match(app,/group\.details\.map/)
})

test('v0.5.14 learns merchant suggestions from saved expenses',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  const css=await readFile(new URL('../src/v0514.css',import.meta.url),'utf8')
  assert.match(app,/merchantSuggestions=useMemo/)
  assert.match(app,/list=\{modal==='purchase'\?'merchant-suggestions'/)
  assert.match(app,/merchantSuggestions\.slice\(0,5\)/)
  assert.match(css,/@media\(max-width:700px\)/)
  assert.match(css,/merchant-suggestions/)
})
