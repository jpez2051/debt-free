import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

test('tile balances and metadata use block layout inside the toggle wrapper',async()=>{
 const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8')
 const tiles=await readFile(new URL('../src/AccountTiles.jsx',import.meta.url),'utf8')
 assert.match(css,/\.account-tile-toggle>strong\{[^}]*display:block/)
 assert.match(css,/\.account-tile-toggle>small\{display:block;margin-top:6px;line-height:1\.45/)
 assert.match(tiles,/<small>Last balance check:/)
 assert.match(tiles,/className="account-tile-toggle"/)
 assert.doesNotMatch(css,/\.account-tile>small\{/)
})
