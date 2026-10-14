import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
import { payoffBudget, simulatePayoff } from '../src/lib/payoff.js'
import { temporaryBoostProjection } from '../src/lib/temporaryBoost.js'

const budget=payoffBudget([{id:'card',balance:3000,apr:24,minimum:90}],0)
const baseline=simulatePayoff(budget.debts,budget.extraBudget)
test('temporary boost validates whole months and dollar precision without mutating a plan',()=>{
 const before=structuredClone(budget)
 for(const duration of ['','0','-1','1.5','1201','Infinity'])assert.ok(temporaryBoostProjection(budget,50,duration,'avalanche',baseline).error)
 for(const amount of ['-1','1.001','Infinity','not money'])assert.ok(temporaryBoostProjection(budget,amount,3,'avalanche',baseline).error)
 assert.equal(temporaryBoostProjection(budget,'',3,'avalanche',baseline).active,false)
 const preview=temporaryBoostProjection(budget,100,3,'avalanche',baseline)
 assert.equal(preview.comparable,true);assert.ok(preview.monthsSaved>=0);assert.ok(preview.interestSaved>=0);assert.deepEqual(budget,before)
})
test('unpayable plans never produce fictitious months or interest savings',()=>{
 const noPayment=payoffBudget([{id:'card',balance:100,apr:0,minimum:0}],0),original=simulatePayoff(noPayment.debts,0)
 const preview=temporaryBoostProjection(noPayment,100,1,'avalanche',original)
 assert.equal(preview.result.paidOff,true);assert.equal(preview.comparable,false);assert.equal(preview.monthsSaved,null);assert.equal(preview.interestSaved,null)
 const empty=temporaryBoostProjection(payoffBudget([],0),100,3,'avalanche',{paidOff:true,months:0,interest:0});assert.equal(empty.noDebt,true)
})
test('shared field styles cover plain inputs and matched currency controls on desktop and phone',async()=>{
 const css=await readFile(new URL('../src/forms.css',import.meta.url),'utf8'),styles=await readFile(new URL('../src/styles.css',import.meta.url),'utf8')
 assert.match(styles,/@import '.\/forms.css'/);assert.match(css,/\.field > input/);assert.match(css,/min-height: 50px/);assert.match(css,/focus-within/);assert.match(css,/repeat\(2, minmax\(0, 1fr\)\)/);assert.match(css,/@media \(max-width: 600px\)/)
 const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8');assert.match(app,/amount=\{scenarioBoost\} months=\{scenarioMonths\}/,'scenario values stay in app session state across page navigation')
 const server=await createServer({server:{middlewareMode:true},appType:'custom'})
 try{const {default:TemporaryBoost}=await server.ssrLoadModule('/src/TemporaryBoost.jsx');const html=renderToStaticMarkup(React.createElement(TemporaryBoost,{budget,strategy:'avalanche',baseline}));assert.match(html,/Extra boost each month/);assert.match(html,/For how many months/);assert.match(html,/max="1200"/);assert.match(html,/aria-live="polite"/);assert.match(html,/does not record a payment/)}finally{await server.close()}
})
