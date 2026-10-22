import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('the direct app source includes account and card-date controls', async () => {
  const output = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')

  for (const expected of [
    'currencyPrecision.js',
    'Next payment due',
    'Partially paid',
    'cyclePaidAmount',
    'lastPaidDueDate',
  ]) assert.ok(output.includes(expected), `missing ${expected}`)
  assert.ok(!output.includes('Field label="Statement closing date"'))
  const statements=await readFile(new URL('../src/ReliabilityCenter.jsx', import.meta.url),'utf8')
  assert.ok(statements.includes('Optional statement details'))
  assert.ok(statements.includes('This statement’s closing date (optional)'))
})
