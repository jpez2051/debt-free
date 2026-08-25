import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.17 themes use shared tokens and explicit icon colors',async()=>{
  const css=await readFile(new URL('../src/v0517.css',import.meta.url),'utf8')
  assert.match(css,/--theme-icon:#52677e/)
  assert.match(css,/\.mobile-primary-nav button\{[^}]*color:var\(--theme-icon\)!important/)
  assert.match(css,/\.mobile-primary-nav button\.active\{color:var\(--mint\)!important/)
  assert.match(css,/\.icon-button\.danger\{color:var\(--theme-danger\)/)
  assert.match(css,/\.settings-section-title>svg[^}]*color:var\(--mint\)/)
  assert.match(css,/@media\(prefers-color-scheme:light\)/)
})
