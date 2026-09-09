import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('credit-score entry opens in an accessible dialog with compact current-score summaries',async()=>{
  const app=await readFile(new URL('../src/CreditScoreTracker.jsx',import.meta.url),'utf8')
  const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8')
  assert.match(app,/Current credit scores/)
  assert.match(app,/currentScores/)
  assert.match(app,/View score history/)
  assert.match(app,/AccessibleDialog/)
  assert.match(app,/Save changes.*Save score/)
  assert.doesNotMatch(app,/<form className="credit-score-form"/)
  assert.match(css,/@media\(max-width:520px\)/)
})
