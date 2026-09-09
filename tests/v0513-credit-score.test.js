import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.13 credit score tracking preserves source and model context', async () => {
  const [app,tracker] = await Promise.all([readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),readFile(new URL('../src/CreditScoreTracker.jsx', import.meta.url), 'utf8')])
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.match(app, /creditScores:\[\]/)
  assert.match(tracker, /Aura:\{bureau:'Not specified',model:'VantageScore 3\.0'\}/)
  assert.match(tracker, /FICO Bankcard Score 8/)
  assert.match(tracker, /scoreSeriesKey/)
  assert.match(css, /current-score-grid/)
  assert.match(css, /@media\(max-width:520px\)/)
})
