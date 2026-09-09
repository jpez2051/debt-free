import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.6.0 starts new browsers empty and keeps reporting state in the app',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/accounts:\[\]/)
  assert.match(app,/transactions:\[\]/)
  assert.match(app,/\[reportPeriod,setReportPeriod\]=useState\('month'\)/)
  assert.match(app,/filterByReportingPeriod\(data\.transactions,reportPeriod\)/)
  assert.match(app,/role="dialog" aria-modal="true"/)
  assert.match(app,/aria-label="Close dialog"/)
})

test('the direct source exposes reporting controls and first-account onboarding',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/START WITH REAL DATA/)
  assert.ok((app.match(/<PeriodPicker/g)||[]).length>=3)
})
