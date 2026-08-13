import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.9 anchors mobile nav to the visual viewport', async () => {
  const nav = await readFile(new URL('../src/AdaptiveNav.jsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('../src/v059.css', import.meta.url), 'utf8')
  assert.ok(nav.includes('window.visualViewport'))
  assert.ok(nav.includes("--df-mobile-nav-top"))
  assert.ok(nav.includes('createPortal(navLayer,document.body)'))
  assert.ok(css.includes('position:absolute!important'))
  assert.ok(css.includes('top:var(--df-mobile-nav-top)!important'))
})
