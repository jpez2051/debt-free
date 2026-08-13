import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transformAppV054 } from '../scripts/v054-app-transform.js'

test('v0.5.4 transform adds the release finance UX', async () => {
  const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const output = transformAppV054(source)

  for (const expected of [
    "const VERSION='0.5.4'",
    'currencyPrecision.js',
    'Next payment due',
    'Statement closing date',
    'Partially paid',
    'Edit card',
    'Remove card',
    'minimumApplied',
    'extraApplied',
  ]) assert.ok(output.includes(expected), `missing ${expected}`)
})
