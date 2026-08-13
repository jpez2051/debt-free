import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v058 mobile nav viewport repair', async () => {
  const css = await readFile(new URL('../src/v058.css', import.meta.url), 'utf8')
  const nav = await readFile(new URL('../src/AdaptiveNav.jsx', import.meta.url), 'utf8')
  assert.ok(css.includes('#root{max-width:100%;overflow-x:hidden!important}'))
  assert.ok(css.includes('body>.mobile-primary-nav{position:fixed!important'))
  assert.ok(nav.includes('createPortal(navLayer,document.body)'))
})
