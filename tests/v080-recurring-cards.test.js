import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.8.0 records recurring card charges without treating them as cash payments',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/funding\.type==='credit'\?Number\(a\.balance\)\+amount/)
  assert.match(app,/fundingType:funding\.type/)
  assert.match(app,/x\.fundingType==='credit'\?x\.required:x\.remaining/)
  assert.match(app,/matching .* already exists/)
  assert.match(app,/frequency==='annual'\?12:1/)
})

test('v0.8.0 exposes subscription schedules, autopay, archive, and account protections',async()=>{
  const transform=await readFile(new URL('../scripts/v080-app-transform.js',import.meta.url),'utf8')
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(transform,/Log recurring charge/)
  assert.match(transform,/Next renewal/)
  assert.match(transform,/Automatic payment/)
  assert.match(transform,/Its type cannot be changed/)
  assert.match(app,/Archive it instead/)
})
