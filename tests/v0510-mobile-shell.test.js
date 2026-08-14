import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.10 uses an internal mobile scroller with normal-flow navigation', async () => {
  const nav = await readFile(new URL('../src/AdaptiveNav.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/v0510.css', import.meta.url), 'utf8')
  const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8')
  const vite = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')

  assert.ok(nav.includes('createPortal(navLayer,document.body)'))
  assert.equal(nav.includes('visualViewport'), false)
  assert.equal(nav.includes('--df-mobile-nav-top'), false)
  assert.ok(css.includes('grid-template-rows:minmax(0,1fr) auto!important'))
  assert.ok(css.includes('overflow-y:auto!important'))
  assert.ok(css.includes('body>.mobile-primary-nav{grid-column:1;grid-row:2;position:relative!important'))
  assert.ok(main.includes("./v0510.css"))
  assert.equal(main.includes("./v059.css"), false)
  assert.ok(vite.includes('transformAppV0510'))
  assert.equal(vite.includes('transformAppV059'), false)
})
