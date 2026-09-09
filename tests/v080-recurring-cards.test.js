import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.8.0 records recurring card charges without treating them as cash payments',async()=>{
  const [app,finance]=await Promise.all([readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),readFile(new URL('../src/lib/finance.js',import.meta.url),'utf8')])
  assert.match(finance,/funding\.type==='credit'/)
  assert.match(finance,/fundingType:funding\.type/)
  assert.match(finance,/fundingType:funding\.type/)
  assert.match(app,/matching .* already exists/)
  assert.match(app,/frequency==='annual'\?12:1/)
})

test('v0.8.0 exposes subscription schedules, autopay, archive, and account protections',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/Log recurring charge/)
  assert.match(app,/Next renewal/)
  assert.match(app,/Automatic payment/)
  assert.match(app,/Its type cannot be changed/)
  assert.match(app,/Archive it instead/)
})
