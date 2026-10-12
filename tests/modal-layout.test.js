import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Structural guardrails complement the actual responsive browser checks.
test('entry dialogs isolate scrollable fields from submit actions outside the mobile root',async()=>{
  const modal=await readFile(new URL('../src/Modal.jsx',import.meta.url),'utf8')
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  const css=await readFile(new URL('../src/modal.css',import.meta.url),'utf8')
  assert.match(modal,/createPortal\(/)
  assert.match(modal,/,document.body\)/)
  assert.match(modal,/<div className="entry-dialog-body">\{children\}<\/div>/)
  assert.match(modal,/<footer className="entry-dialog-footer">/)
  assert.match(modal,/type="submit" className="primary submit"/)
  assert.ok(!app.includes('className="primary submit"'),'Save is not duplicated in scrolling fields')
  assert.match(css,/\.entry-dialog-body\{[^}]*min-height:0;overflow-y:auto/)
  assert.match(css,/\.entry-dialog-footer\{flex:none/)
  assert.match(css,/min-height:48px/)
})
test('dialog sizing follows the visual viewport and cleans up its listeners',async()=>{
  const modal=await readFile(new URL('../src/Modal.jsx',import.meta.url),'utf8')
  const css=await readFile(new URL('../src/modal.css',import.meta.url),'utf8')
  assert.match(modal,/window.visualViewport/)
  for(const event of ['resize','scroll']){
    assert.ok(modal.includes(`addEventListener('${event}',resize)`))
    assert.ok(modal.includes(`removeEventListener('${event}',resize)`))
  }
  assert.match(css,/--dialog-viewport-height,100dvh/)
  assert.match(css,/safe-area-inset-bottom/)
  assert.match(modal,/root.inert=wasInert/)
})
