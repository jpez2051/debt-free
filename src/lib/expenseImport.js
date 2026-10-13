import { calendarDate, cents, hasDuplicateLedgerTransaction, localDate, saveLedgerTransaction, transactionDay } from './finance.js'
import { DEFAULT_OTHER_CATEGORY } from './categories.js'
export function parseCsv(text){
  if(typeof text!=='string'||text.length>2_000_000)throw Error('Choose a CSV smaller than 2 MB.')
  const rows=[];let row=[],value='',quoted=false,closed=false
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}}else value+=c;continue}if(c==='"'){if(value.trim()||closed)throw Error('CSV quotes are malformed.');quoted=true;continue}if(c===','||c==='\n'||c==='\r'){row.push(value);value='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[]}}else{if(closed&&!/\s/.test(c))throw Error('Unexpected text after a quoted CSV field.');value+=c}if(rows.length>501)throw Error('Import at most 500 expenses at a time; split large files by month.')}
  if(quoted)throw Error('A CSV quote was not closed.');row.push(value);if(row.some(x=>x.trim()))rows.push(row)
  if(rows.length>501)throw Error('Import at most 500 expenses at a time; split large files by month.')
  if(rows.length<2)throw Error('The CSV needs a header and at least one data row.')
  rows[0][0]=rows[0][0].replace(/^\uFEFF/,'')
  return {headers:rows[0],rows:rows.slice(1)}
}
export function importDate(value){const raw=String(value||'').trim(),match=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/),date=match?`${match[3]}-${match[1].padStart(2,'0')}-${match[2].padStart(2,'0')}`:raw;return calendarDate(date)?date:null}
export function previewExpenses(data,csv,{dateColumn,merchantColumn,amountColumn,sign,accountId,historical=true},now=new Date()){
  if(!data.accounts.some(a=>a.id===accountId&&a.type!=='savings'))throw Error('Choose a checking account or credit card.')
  if(!['positive','negative'].includes(sign))throw Error('Choose whether this CSV records expenses as positive or negative amounts.')
  if([dateColumn,merchantColumn,amountColumn].some(index=>!Number.isInteger(index)||index<0||index>=csv.headers.length)||new Set([dateColumn,merchantColumn,amountColumn]).size!==3)throw Error('Choose three distinct valid columns for date, merchant and amount.')
  const seen=new Set()
  return csv.rows.map((row,index)=>{
    const date=importDate(row[dateColumn]),merchant=String(row[merchantColumn]||'').trim(),raw=String(row[amountColumn]||'').trim().replace(/[$,\s]/g,'').replace(/^\((.*)\)$/,'-$1'),number=raw===''?NaN:Number(raw),amount=Math.abs(number)
    let error=!date?'Unsupported date (use YYYY-MM-DD or MM/DD/YYYY)':date>localDate(now)?'Future completed expense':!merchant?'Missing merchant':!Number.isFinite(number)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>.00001?'Invalid dollar amount':sign==='negative'&&number>=0||sign==='positive'&&number<=0?'Not an expense with the selected amount sign':''
    const form={...DEFAULT_OTHER_CATEGORY,date,merchant,amount,accountId,historical,importedExpense:true,categoryReviewed:false},key=[date,merchant.toLocaleLowerCase(),amount,accountId].join('|'),crossMatches=[...(data.billPayments||[]).map(p=>({...p,accountId:p.bankId,source:'bill'})),...(data.payments||[]).map(p=>({...p,accountId:p.bankId,source:'card payment'})),...(data.transactions||[]).filter(t=>t.kind==='transfer').map(t=>({...t,source:'transfer'}))].filter(p=>p.accountId===accountId&&transactionDay(p)===date&&cents(p.amount)===cents(amount)),duplicate=!error&&(seen.has(key)||hasDuplicateLedgerTransaction(data,form,'purchase')||crossMatches.length>0)
    seen.add(key)
    const classificationWarning=/\b(transfer|payment|payroll|deposit)\b/i.test(merchant)
    return {index,form,error,duplicate,classificationWarning,crossMatches}
  })
}
export function applyExpenseImport(data,rows,selected,now=new Date()){
  if(!selected.length)throw Error('Select at least one expense.')
  if(new Set(selected).size!==selected.length)throw Error('A row was selected more than once. Nothing was imported.')
  let next=data
  for(const index of selected){const row=rows.find(x=>x.index===index);if(!row||row.error)throw Error('An invalid row was selected. Nothing was imported.');next=saveLedgerTransaction(next,row.form,'purchase',now)}
  return next
}
