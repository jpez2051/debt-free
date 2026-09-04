import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { analyzeDataHealth } from '../src/lib/dataHealth.js'
import { validateData } from '../src/lib/backup.js'
import { parseBackup } from '../src/lib/storage.js'
import config from '../vite.config.js'

const data=()=>({financeVersion:1,accounts:[{id:'card',name:'Card',type:'credit',balance:100,limit:1000}],transactions:[{id:'a',kind:'purchase',accountId:'card',merchant:'Parking',amount:3,date:'2026-09-01T12:00:00Z',localDate:'2026-09-01'},{id:'b',kind:'purchase',accountId:'card',merchant:'parking',amount:3,date:'2026-09-01T12:00:00Z',localDate:'2026-09-01'}],payments:[],bills:[],billPayments:[],creditScores:[],cardStatements:[],billCycles:[],adjustments:[],extra:0,dataHealthAcknowledgements:[]})

test('duplicate findings have a stable acknowledgement identity',()=>{const first=data(),id=analyzeDataHealth(first,new Date(2026,8,3,12)).issues.find(x=>x.kind==='duplicate').id;first.transactions.reverse();assert.equal(analyzeDataHealth(first,new Date(2026,8,3,12)).issues.find(x=>x.kind==='duplicate').id,id);assert.match(id,/a:b/)})

test('reviewed finding decisions validate and survive backup parsing',()=>{const value=data(),id=analyzeDataHealth(value).issues.find(x=>x.kind==='duplicate').id;value.dataHealthAcknowledgements=[id];assert.equal(validateData(value),true);assert.deepEqual(parseBackup(JSON.stringify({data:value})).dataHealthAcknowledgements,[id]);value.dataHealthAcknowledgements.push(id);assert.equal(validateData(value),false)})

test('release provides a top jump button and persistent reviewed controls',async()=>{const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),output=config.plugins[0].transform(source,'/src/App.jsx'),component=await readFile(new URL('../src/DataHealth.jsx',import.meta.url),'utf8'),healthSource=await readFile(new URL('../src/lib/dataHealth.js',import.meta.url),'utf8');assert.match(output,/View Data Health/);assert.match(output,/aria-controls="data-health"/);assert.match(output,/scrollIntoView/);assert.match(output,/<DataHealth data=\{data\} update=\{update\}/);assert.match(healthSource,/Keep both/);assert.match(component,/Reviewed findings/);assert.match(component,/Review this again/);assert.match(output,/const VERSION='0\.9\.8'/)})
