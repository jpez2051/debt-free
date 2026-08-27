import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { prepareData } from '../src/lib/finance.js'

test('all main pages render migrated financial data through the final build pipeline',async()=>{
  const fixture=prepareData({accounts:[{id:'c',name:'Test Visa',type:'credit',balance:500,minimum:25,apr:20,nextDueDate:'2026-09-15'},{id:'b',name:'Test Checking',type:'checking',balance:1000}],transactions:[],payments:[],bills:[{id:'bill',name:'Test subscription',amount:10,dueDay:28,accountId:'c',active:true}],extra:0,strategy:'avalanche'},new Date(2026,7,27,12))
  const prior=globalThis.localStorage
  globalThis.localStorage={getItem:key=>key==='debt-free-v040'?JSON.stringify(fixture):null,setItem(){}}
  let page='dashboard'
  const server=await createServer({server:{middlewareMode:true},appType:'custom',plugins:[{name:'test-initial-page',enforce:'pre',transform(code,id){if(id.endsWith('/src/App.jsx'))return code.replace("useState('dashboard')",`useState('${page}')`)}}]})
  try{
    for(const [route,text] of [['dashboard','Cash after tracked obligations'],['accounts','Reconcile balance'],['transactions','Log refund'],['bills','Bill occurrences'],['debts','Statements'],['payoff','no new charges or fees'],['spending','Net spending trend'],['insights','Credit score history']]){
      page=route;server.moduleGraph.invalidateAll()
      const {default:App}=await server.ssrLoadModule('/src/App.jsx')
      const html=renderToStaticMarkup(React.createElement(App))
      assert.ok(html.includes(text),`${route} renders its controls`)
      assert.ok(!html.includes('NaN'),`${route} has finite amounts`)
    }
  }finally{globalThis.localStorage=prior;await server.close()}
})
