import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('every transaction date field uses the click-to-open calendar control', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /function DateInput\(/)
  assert.match(app, /showPicker\?\.\(\)/)
  assert.ok((app.match(/<DateInput /g) || []).length >= 7)
  assert.match(app, /Next payment due"><DateInput/)
  assert.doesNotMatch(app, /Statement closing date"><DateInput/)
  const statements=await readFile(new URL('../src/ReliabilityCenter.jsx', import.meta.url), 'utf8')
  assert.match(statements,/This statement’s closing date \(optional\)<input type="date"/)
  assert.match(statements,/showPicker\?\.\(\)/)
  assert.match(app, /modal==='transfer'.*<DateInput/)
})
