import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('expense entry keeps native date fields and clear terminology', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')

  assert.match(app, /DEFAULT_EXPENSE_CATEGORY/)
  assert.match(css, /input\[type="date"\].*max-width:100%.*min-width:0/)
  assert.match(css, /form-row>label\{min-width:0\}/)
  assert.match(app, /> Expense<\/button>/)
  assert.match(app, /Edit expense':'Add expense/)
})
