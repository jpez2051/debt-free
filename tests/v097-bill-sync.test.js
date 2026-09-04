import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { prepareData } from '../src/lib/finance.js'
import config from '../vite.config.js'

const now=new Date(2026,8,3,12)
const fixture=()=>({financeVersion:1,accounts:[{id:'card',name:'Card',type:'credit',balance:100,limit:1000,minimum:10}],transactions:[],payments:[],bills:[{id:'music',name:'Music',amount:20.89,dueDay:27,nextDueDate:'2026-08-27',frequency:'monthly',active:true,accountId:'card'}],billPayments:[{id:'paid',billId:'music',cycleId:'past',bankId:'card',amount:20.89,date:'2026-08-27T12:00:00Z',localDate:'2026-08-27'}],creditScores:[],cardStatements:[],billCycles:[{id:'past',billId:'music',dueDate:'2026-08-24',expectedAmount:17.75,actualAmount:20.89,needsReview:false},{id:'stale',billId:'music',dueDate:'2026-09-24',expectedAmount:17.75,actualAmount:null,needsReview:false}],adjustments:[],extra:0})

test('loading automatically synchronizes an unpaid future occurrence without rewriting history',()=>{const source=fixture(),historical=structuredClone({cycle:source.billCycles[0],payment:source.billPayments[0]}),next=prepareData(source,now);assert.equal(next.billCycles.some(c=>c.id==='stale'),false);const future=next.billCycles.find(c=>c.dueDate==='2026-09-27');assert.equal(future.expectedAmount,20.89);assert.equal(next.bills[0].nextDueDate,'2026-09-27');assert.deepEqual(next.billCycles.find(c=>c.id==='past'),historical.cycle);assert.deepEqual(next.billPayments[0],historical.payment);assert.equal(source.billCycles[1].expectedAmount,17.75)})

test('confirmed or paid future occurrences remain protected from automatic synchronization',()=>{const source=fixture();source.billCycles[1].actualAmount=17.75;const next=prepareData(source,now);assert.ok(next.billCycles.some(c=>c.id==='stale'&&c.actualAmount===17.75));assert.equal(next.billCycles.some(c=>c.dueDate==='2026-09-27'),false)})

test('bill rows clearly label the due amount and current occurrence differences',async()=>{const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),output=config.plugins[0].transform(source,'/src/App.jsx');assert.match(output,/`Due \$\{money2\.format\(amount\)\}`/);assert.match(output,/Current occurrence/);assert.match(output,/const VERSION='0\.9\.9'/)})
