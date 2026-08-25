import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transformAppV060 } from '../scripts/v060-app-transform.js'

test('v0.6.0 starts new browsers empty and keeps reporting state in the app',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/accounts:\[\]/)
  assert.match(app,/transactions:\[\]/)
  assert.match(app,/\[reportPeriod,setReportPeriod\]=useState\('month'\)/)
  assert.match(app,/filterByReportingPeriod\(data\.transactions,reportPeriod\)/)
  assert.match(app,/role="dialog" aria-modal="true"/)
  assert.match(app,/aria-label="Close dialog"/)
})

test('v0.6.0 exposes reporting controls and first-account onboarding',()=>{
  const source="const VERSION='0.5.18' {page==='dashboard'&&<> {page==='spending'&&<PageHead title=\"Spending\" text=\"See category, merchant and account totals behind every dollar.\"><section {page==='insights'&&<><PageHead title=\"Insights\" text=\"Cash flow context makes recommendations more useful than generic budgeting advice.\"><div className=\"insight-grid\">"
  const result=transformAppV060(source)
  assert.match(result,/const VERSION='0\.6\.0'/)
  assert.match(result,/START WITH REAL DATA/)
  assert.equal((result.match(/<PeriodPicker/g)||[]).length,3)
})
