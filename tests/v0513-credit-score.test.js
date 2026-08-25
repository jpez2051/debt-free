import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.13 credit score tracking preserves source and model context', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/v0513.css', import.meta.url), 'utf8')
  assert.match(app, /creditScores:\[\]/)
  assert.match(app, /Aura:\{bureau:'Equifax',model:'VantageScore 3\.0'\}/)
  assert.match(app, /FICO Bankcard Score 8/)
  assert.match(app, /y\.source===x\.source&&y\.bureau===x\.bureau&&y\.model===x\.model/)
  assert.match(css, /credit-score-form/)
  assert.match(css, /@media\(max-width:520px\)/)
})
