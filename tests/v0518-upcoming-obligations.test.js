import test from 'node:test'
import assert from 'node:assert/strict'
import { transformAppV0518 } from '../scripts/v0518-app-transform.js'

test('v0.5.18 renders card minimum status in upcoming obligations',()=>{
  const source="const VERSION='0.5.17' Cash less recurring bills and card minimums data.bills.length?data.bills.filter(b=>b.active!==false).sort((a,b)=>a.dueDay-b.dueDay).slice(0,5).map(b=><Row key={b.id} left={b.name} right={money.format(b.amount)} sub={`Due day ${b.dueDay} · ${account(b.accountId)?.name||'Unassigned'}`}/>):<Empty text=\"Add recurring bills to see what your cash is already committed to.\"/>"
  const result=transformAppV0518(source)
  assert.match(result,/const VERSION='0\.5\.18'/)
  assert.match(result,/unpaid card minimums/)
  assert.match(result,/obligations\.map/)
  assert.match(result,/item\.paid/)
  assert.match(result,/'Paid'/)
})
