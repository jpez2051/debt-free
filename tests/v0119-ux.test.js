import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RELEASE_VERSION } from '../src/release.js'

const fixture=()=>({
  accounts:[{id:'bank',name:'Example Checking',type:'checking',balance:1234.56,reconciledAt:'2026-09-20T12:00:00Z'},{id:'card',name:'Example Card',type:'credit',balance:9500,minimum:500}],
  payments:[],transactions:[],bills:[{id:'bill',name:'Example Subscription',amount:20}],billPayments:[],
  cardStatements:[{id:'sep',cardId:'card',dueDate:'2026-09-20',minimum:500}],
  billCycles:[{id:'cycle',billId:'bill',dueDate:'2026-09-25',expectedAmount:20,actualAmount:null}],
  adjustments:[],extra:0,
})

test('one package version feeds the app, backups, and release checks',async()=>{
  const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'))
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.equal(RELEASE_VERSION,pkg.version)
  assert.match(app,/const VERSION=RELEASE_VERSION/)
  assert.doesNotMatch(app,/const VERSION=['"]/)
  assert.match(app,/maximumFractionDigits:2/)
})

test('light theme accents remain readable as text on white',async()=>{
  const css=await readFile(new URL('../src/styles.css',import.meta.url),'utf8')
  const colors=['146b4b','315cbd','7046b0','835200']
  const luminance=hex=>{
    const [red,green,blue]=[0,2,4].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4)
    return 0.2126*red+0.7152*green+0.0722*blue
  }
  for(const color of colors){assert.ok(css.includes(`#${color}`));assert.ok(1.05/(luminance(color)+0.05)>=4.5,color)}
  assert.match(css,/@media\(prefers-color-scheme:light\)/)
  assert.match(css,/--section-gap:24px/)
  assert.doesNotMatch(css,/margin:-48px 0 18px|margin:-6px 0 18px/)
})

test('long review sections collapse without deleting records or changing balances',async()=>{
  const data=fixture(),before=structuredClone(data)
  const server=await createServer({server:{middlewareMode:true},appType:'custom'})
  try{
    const {default:ReliabilityCenter}=await server.ssrLoadModule('/src/ReliabilityCenter.jsx')
    const render=page=>renderToStaticMarkup(React.createElement(ReliabilityCenter,{data,update(){throw new Error('Rendering must not save')},page,onPayBill(){}}))
    const accounts=render('accounts'),bills=render('bills'),debts=render('debts')
    assert.match(accounts,/Check balances against your bank/)
    assert.match(accounts,/1 of 2 accounts checked/)
    assert.match(accounts,/Example Checking/)
    assert.match(bills,/Review occurrences \(1\)/)
    assert.match(bills,/Example Subscription/)
    assert.match(debts,/Review statements \(1\)/)
    assert.match(debts,/Example Card/)
    assert.deepEqual(data,before)
  }finally{await server.close()}
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
  assert.match(app,/View recorded payments \(\{data\.payments\.length\}\)/)
  assert.match(app,/data\.bills\.slice\(\)\.sort/)
  assert.doesNotMatch(app,/data\.bills\.sort/)
})
