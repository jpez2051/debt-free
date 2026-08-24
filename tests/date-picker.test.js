import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('every transaction date field uses the click-to-open calendar control', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const cardTransform = await readFile(new URL('../scripts/v054-app-transform.js', import.meta.url), 'utf8')
  const transferTransform = await readFile(new URL('../scripts/v055-app-transform.js', import.meta.url), 'utf8')

  assert.match(app, /function DateInput\(/)
  assert.match(app, /showPicker\?\.\(\)/)
  assert.equal((app.match(/<DateInput /g) || []).length, 2)
  assert.equal((app.match(/<input type="date"/g) || []).length, 1)
  assert.equal((cardTransform.match(/<input type=\\"date\\"/g) || []).length, 0)
  assert.equal((transferTransform.match(/<input type=\\"date\\"/g) || []).length, 0)
  assert.match(cardTransform, /Next payment due\\"><DateInput/)
  assert.match(cardTransform, /Statement closing date\\"><DateInput/)
  assert.match(transferTransform, /modal==='transfer'.*<DateInput/)
})
