import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('the direct app source includes account and card-date controls', async () => {
  const output = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

  for (const expected of [
    'currencyPrecision.js',
    'Next payment due',
    'Statement closing date',
    'Partially paid',
    'cyclePaidAmount',
    'lastPaidDueDate',
  ]) assert.ok(output.includes(expected), `missing ${expected}`)
})
