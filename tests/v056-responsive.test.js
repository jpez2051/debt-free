import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.6 responsive repair loads last and protects narrow layouts', async () => {
  const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
  const vite = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')
  assert.ok(main.includes("./styles.css"))
  assert.match(css, /@media\(max-width:900px\)/)
  assert.match(css, /\.shell\{display:block!important/)
  assert.match(css, /\.hero-card\{grid-template-columns:1fr!important/)
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/)
  assert.doesNotMatch(vite, /app-transform/)
})
