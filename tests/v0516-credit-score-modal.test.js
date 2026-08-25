import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.5.16 opens credit-score entry in a modal',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  const css=await readFile(new URL('../src/v0516.css',import.meta.url),'utf8')
  assert.match(app,/\[open,setOpen\]=useState\(false\)/)
  assert.match(app,/onClick=\{\(\)=>setOpen\(true\)\}/)
  assert.match(app,/open&&<Modal title="Add credit score"/)
  assert.match(app,/>Save score<\/button>/)
  assert.doesNotMatch(app,/<form className="credit-score-form"/)
  assert.match(css,/@media\(max-width:520px\)/)
})
