import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transformAppV054 } from '../scripts/v054-app-transform.js'

test('v0.5.4 transform applies all finance UX changes', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const output = transformAppV054(source)

  assert.match(output, /const VERSION='0\.5\.4'/)
  assert.match(output, /currencyPrecision\.js/)
  assert.match(output, /Next payment due/)
  assert.match(output, /Statement closing date/)
  assert.match(output, /Paid last cycle/)
  assert.match(output, /Partially paid/)
  assert.match(output, /Edit card/)
  assert.match(output, /Remove card/)
  assert.match(output, /minimumApplied/)
  assert.match(output, /extraApplied/)
  assert.doesNotMatch(output, /Field label="Due day"/)
  assert.doesNotMatch(output, /Field label="Statement day"/)
})
