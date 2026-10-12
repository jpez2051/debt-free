import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, previewExpenses, applyExpenseImport } from '../src/lib/expenseImport.js'
import { prepareData } from '../src/lib/finance.js'
const now=new Date(2026,9,12,12),data=prepareData({accounts:[{id:'b',name:'Bank',type:'checking',balance:100},{id:'c',name:'Card',type:'credit',balance:200}],transactions:[],payments:[],bills:[]},now),mapping={dateColumn:0,merchantColumn:1,amountColumn:2,sign:'negative',accountId:'b',historical:true}
test('CSV handles commas, escaped quotes, BOM and quoted newlines without executing text',()=>{
 const csv=parseCsv('\uFEFFDate,Description,Amount\r\n10/01/2026,"Store, ""A""",-12.34\r\n2026-10-02,"Two\nlines",-5')
 assert.equal(csv.headers[0],'Date');assert.equal(csv.rows[0][1],'Store, "A"');assert.equal(csv.rows[1][1],'Two\nlines');assert.throws(()=>parseCsv('Date,Name,Amount\n"unfinished'),/not closed/)
})
test('preview identifies duplicates, invalid/future rows and possible non-expenses without mutating data',()=>{
 const before=structuredClone(data),csv=parseCsv('Date,Name,Amount\n2026-10-01,Shop,-10\n2026-10-01,Shop,-10\n2026-10-02,Card payment,-5\n2026-10-13,Future,-2\n2026-10-03,Income,100'),rows=previewExpenses(data,csv,mapping,now)
 assert.equal(rows[1].duplicate,true);assert.equal(rows[2].classificationWarning,true);assert.match(rows[3].error,/Future/);assert.ok(rows[4].error);assert.deepEqual(data,before)
})
test('historical imports preserve balances, new imports move only selected account, and invalid batches are atomic',()=>{
 const csv=parseCsv('Date,Name,Amount\n10/01/2026,Shop,-10\n10/02/2026,Fuel,-5'),rows=previewExpenses(data,csv,mapping,now),historical=applyExpenseImport(data,rows,[0,1],now)
 assert.equal(historical.accounts[0].balance,100);assert.equal(historical.transactions.length,2);assert.equal(historical.transactions[0].category,'Other')
 const fresh=previewExpenses(data,csv,{...mapping,historical:false},now);assert.equal(applyExpenseImport(data,fresh,[0,1],now).accounts[0].balance,85)
 const cardRows=previewExpenses(data,csv,{...mapping,historical:false,accountId:'c'},now);assert.equal(applyExpenseImport(data,cardRows,[0,1],now).accounts[1].balance,215)
 assert.throws(()=>applyExpenseImport(data,[...fresh,{index:2,error:'invalid'}],[0,2],now),/invalid/);assert.equal(data.transactions.length,0)
})
