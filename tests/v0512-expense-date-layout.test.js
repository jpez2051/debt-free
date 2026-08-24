import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { transformAppV0512 } from '../scripts/v0512-app-transform.js'

test('v0.5.12 contains native date fields and expense terminology', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/v0512.css', import.meta.url), 'utf8')
  const transformed = transformAppV0512(`const VERSION='0.5.11' merchant:(form.merchant||(kind==='income'?'Income':'Purchase')).trim() > Purchase</button> ['Purchases',spend] Income, purchases and external transfers stay separate so spending totals remain accurate. > Add purchase</button> form.id?'Edit purchase':'Log purchase' Log purchases to unlock category-specific insights. Once discretionary purchases are logged, Debt Free can quantify payoff opportunities.`)

  assert.match(app, /'Interest'/)
  assert.match(css, /input\[type="date"\].*max-width:100%.*min-width:0/)
  assert.match(css, /form-row>label\{min-width:0\}/)
  assert.match(transformed, /VERSION='0\.5\.12'/)
  assert.match(transformed, /> Expense<\/button>/)
  assert.match(transformed, /> Add expense<\/button>/)
  assert.match(transformed, /Edit expense':'Add expense/)
})
