import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.15 adds account-aware spending breakdowns',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/value="account">Account/)
  assert.match(app,/SpendingBreakdown purchases=\{purchases\} accounts=\{data\.accounts\}/)
  assert.match(app,/accountNames\[t\.accountId\]\|\|'Unknown account'/)
  assert.match(app,/`\$\{merchant\} · \$\{account\}`/)
  assert.match(app,/`\$\{category\} · \$\{account\}`/)
  assert.match(app,/`\$\{category\} · \$\{merchant\}`/)
})
