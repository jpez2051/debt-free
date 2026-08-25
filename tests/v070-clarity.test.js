import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('v0.7.0 keeps bill payments backward compatible and integrates clarity features',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  const vite=await readFile(new URL('../vite.config.js',import.meta.url),'utf8')
  assert.match(app,/billPayments:\[\]/)
  assert.match(app,/saved\.billPayments\|\|\[\]/)
  assert.match(app,/saveBillPayment/)
  assert.match(app,/remainingBills/)
  assert.match(vite,/transformAppV070/)
})

test('v0.7.0 ships setup, spending, and comparable score visuals',async()=>{
  const [setup,trends,scores,css]=await Promise.all([
    readFile(new URL('../src/SetupGuide.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/SpendingTrends.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/CreditScoreChart.jsx',import.meta.url),'utf8'),
    readFile(new URL('../src/v070.css',import.meta.url),'utf8'),
  ])
  assert.match(setup,/Setup progress/)
  assert.match(trends,/SIX-MONTH VIEW/)
  assert.match(scores,/source\}\|\$\{x\.bureau\}\|\$\{x\.model/)
  assert.match(css,/@media\(max-width:620px\)/)
})
