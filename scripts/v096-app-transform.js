function line(code,prefix,replacement){const found=code.split('\n').find(value=>value.startsWith(prefix));if(!found)throw new Error(`v0.9.6 missing ${prefix}`);return code.replace(found,replacement)}

export function transformAppV096(source){
  let code=`import CreditScoreTracker from './CreditScoreTracker.jsx'\nimport DataHealth from './DataHealth.jsx'\nimport { saveRecurringBill, hasDuplicateLedgerTransaction } from './lib/finance.js'\n${source}`
  code=code.replace("const VERSION='0.9.5'","const VERSION='0.9.6'")
  code=line(code,' const saveTransaction='," const saveTransaction=(kind,e)=>{e.preventDefault();action(()=>{if(hasDuplicateLedgerTransaction(data,form,kind)&&!confirm('A matching activity entry already exists for this account, date, amount and name. Save another anyway?'))return;const next=saveLedgerTransaction(data,form,kind),changed=next.accounts.find(a=>a.id===form.accountId),old=account(form.accountId);if(!form.historical&&changed?.type!=='credit'&&changed.balance<0&&changed.balance<old.balance&&!confirm('This entry will leave the cash account below zero. Continue?'))return;finish(next)})}")
  code=line(code,' const saveBill='," const saveBill=e=>{e.preventDefault();action(()=>finish(saveRecurringBill(data,form)))}")
  code=line(code,' const addCreditScore='," const saveCreditScore=entry=>update({...data,creditScores:entry.id?creditScores.map(x=>x.id===entry.id?entry:x):[{...entry,id:crypto.randomUUID()},...creditScores]})")
  code=code.replace('<CreditScoreTracker entries={creditScores} onAdd={addCreditScore} onRemove={removeCreditScore}/>','<CreditScoreTracker entries={creditScores} onSave={saveCreditScore} onRemove={removeCreditScore}/><DataHealth data={data}/>')
  const start=code.indexOf('function CreditScoreTracker('),end=code.indexOf('function Modal(',start)
  if(start<0||end<0)throw new Error('v0.9.6 credit score component anchors missing')
  code=code.slice(0,start)+code.slice(end)
  return code.replaceAll('safe-to-spend cushion','cash-after-obligations cushion')
}
