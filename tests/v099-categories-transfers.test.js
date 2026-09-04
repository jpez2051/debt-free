import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import config from '../vite.config.js'
import { categorySelection, isSavedOrInvestedTransfer, merchantProfiles } from '../src/lib/categories.js'
import { netSpendingEntries, prepareData, removeLedgerTransaction, saveLedgerTransaction } from '../src/lib/finance.js'
import { activityEntries, filterActivity } from '../src/lib/activity.js'
import { validateData } from '../src/lib/backup.js'
import { parseBackup } from '../src/lib/storage.js'

const now=new Date(2026,8,4,12)
const base=()=>prepareData({financeVersion:1,accounts:[{id:'checking',name:'Checking',type:'checking',balance:1000},{id:'savings',name:'Savings',type:'savings',balance:100}],transactions:[],payments:[],bills:[],billPayments:[],creditScores:[],cardStatements:[],billCycles:[],adjustments:[],extra:0},now)

test('legacy categories gain useful reporting detail without rewriting saved records',()=>{
  const original={id:'old',kind:'purchase',category:'Dining',merchant:'Cafe',accountId:'checking',amount:10,date:'2026-09-01T12:00:00Z',localDate:'2026-09-01'}
  const data=base();data.transactions=[original]
  assert.deepEqual(categorySelection(original),{category:'Food & Drink',subcategory:'Restaurants & Takeout'})
  assert.equal(data.transactions[0].category,'Dining')
  assert.deepEqual(netSpendingEntries(data)[0],{...original,category:'Food & Drink',subcategory:'Restaurants & Takeout'})
})

test('merchant profiles learn the most-used category and use recency to break ties',()=>{
  const entries=[
    {kind:'purchase',merchant:'7-Eleven',category:'Dining',date:'2026-08-01T12:00:00Z'},
    {kind:'purchase',merchant:'7-eleven',category:'Food & Drink',subcategory:'Coffee & Snacks',date:'2026-09-01T12:00:00Z'},
    {kind:'purchase',merchant:'Market',category:'Groceries',date:'2026-09-02T12:00:00Z'},
    {kind:'purchase',merchant:'Market',category:'Groceries',date:'2026-09-03T12:00:00Z'},
  ]
  const profiles=merchantProfiles(entries),store=profiles.find(item=>item.name==='7-Eleven'),market=profiles.find(item=>item.name==='Market')
  assert.deepEqual({category:store.category,subcategory:store.subcategory},{category:'Food & Drink',subcategory:'Coffee & Snacks'})
  assert.deepEqual({category:market.category,subcategory:market.subcategory},{category:'Food & Drink',subcategory:'Groceries'})
})

test('tracked transfers update both balances, stay out of spending, and reverse safely',()=>{
  const original=base(),form={accountId:'checking',toAccountId:'savings',merchant:'',transferPurpose:'Savings contribution',amount:200,date:'2026-09-04',historical:false}
  let data=saveLedgerTransaction(original,form,'transfer',now)
  assert.deepEqual(data.accounts.map(account=>account.balance),[800,300])
  assert.equal(data.accounts.reduce((sum,account)=>sum+account.balance,0),1100)
  assert.equal(netSpendingEntries(data).length,0)
  assert.equal(isSavedOrInvestedTransfer(data.transactions[0]),true)
  assert.equal(validateData(data),true)
  assert.equal(parseBackup(JSON.stringify({data})).transactions[0].toAccountId,'savings')
  data=saveLedgerTransaction(data,{...data.transactions[0],date:'2026-09-04',amount:250},'transfer',now)
  assert.deepEqual(data.accounts.map(account=>account.balance),[750,350])
  data=removeLedgerTransaction(data,data.transactions[0].id,now)
  assert.deepEqual(data.accounts.map(account=>account.balance),[1000,100])
})

test('outside investment contributions reduce the source without becoming spending',()=>{
  const data=saveLedgerTransaction(base(),{accountId:'checking',toAccountId:'',merchant:'Acorns',transferPurpose:'Investment contribution',amount:50,date:'2026-09-04',historical:false},'transfer',now)
  assert.deepEqual(data.accounts.map(account=>account.balance),[950,100])
  assert.equal(data.transactions[0].merchant,'Acorns')
  assert.equal(isSavedOrInvestedTransfer(data.transactions[0]),true)
  assert.equal(netSpendingEntries(data).length,0)
})

test('internal transfers appear under both accounts in Activity',()=>{
  const data=saveLedgerTransaction(base(),{accountId:'checking',toAccountId:'savings',merchant:'',transferPurpose:'Savings contribution',amount:25,date:'2026-09-04',historical:true},'transfer',now),entries=activityEntries(data)
  assert.deepEqual(entries[0].accountIds,['checking','savings'])
  assert.equal(filterActivity(entries,{accountId:'savings',period:'all',type:'transfer',search:'',from:'',to:''},now).entries.length,1)
})

test('v0.9.9 release exposes detailed categories, smart merchants, and transfer destinations',async()=>{
  const output=config.plugins[0].transform(await readFile(new URL('../src/App.jsx',import.meta.url),'utf8'),'/src/App.jsx'),categorySource=await readFile(new URL('../src/lib/categories.js',import.meta.url),'utf8')
  for(const text of ['Main category','Subcategory','Saved & invested','Outside tracked accounts (for example Acorns)','merchantProfiles','toAccountId'])assert.ok(output.includes(text),text)
  assert.match(categorySource,/Fast Food/);assert.match(categorySource,/Investment contribution/)
  assert.match(output,/const VERSION='0\.9\.9'/)
})
