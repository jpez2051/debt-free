import { cents, localDate, transactionDay } from './finance.js'

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})
const dayDistance=(a,b)=>Math.round(Math.abs(new Date(`${a}T12:00:00`)-new Date(`${b}T12:00:00`))/86400000)

export function analyzeDataHealth(data,now=new Date()){
  const today=localDate(now),issues=[],duplicates=new Map()
  for(const item of data.transactions||[]){
    const key=[item.kind,item.accountId,transactionDay(item),cents(item.amount),String(item.merchant||'').trim().toLocaleLowerCase()].join('|')
    duplicates.set(key,[...(duplicates.get(key)||[]),item])
  }
  for(const matches of duplicates.values())if(matches.length>1)issues.push({kind:'duplicate',level:'warning',title:'Possible duplicate activity',detail:`${matches.length} matching entries for ${matches[0].merchant||'an activity item'} on ${transactionDay(matches[0])} at ${money.format(matches[0].amount)}. Review before removing anything.`})

  for(const card of (data.accounts||[]).filter(a=>a.type==='credit'))if(!(data.cardStatements||[]).some(s=>s.cardId===card.id&&!s.supersededBy&&!s.needsReview&&s.dueDate>=today))issues.push({kind:'statement',level:'warning',title:`${card.name} needs a current statement`,detail:'Add or confirm the next due date and minimum so upcoming obligations are complete.'})

  const paidCycles=new Set((data.billPayments||[]).map(p=>p.cycleId).filter(Boolean))
  for(const bill of (data.bills||[]).filter(b=>b.active!==false)){
    const upcoming=(data.billCycles||[]).filter(c=>c.billId===bill.id&&c.dueDate>=today&&c.actualAmount==null&&!paidCycles.has(c.id)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]
    if(upcoming&&(cents(upcoming.expectedAmount)!==cents(bill.amount)||new Date(`${upcoming.dueDate}T12:00:00`).getDate()!==Number(bill.dueDay)))issues.push({kind:'bill',level:'warning',title:`${bill.name} schedule needs syncing`,detail:`The bill is ${money.format(bill.amount)} around day ${bill.dueDay}, but its next occurrence is ${money.format(upcoming.expectedAmount)} on ${upcoming.dueDate}. Edit and save the bill to synchronize future occurrences.`})
  }

  for(const account of data.accounts||[]){
    const checked=account.reconciledAt?localDate(new Date(account.reconciledAt)):''
    if(!checked||dayDistance(checked,today)>45)issues.push({kind:'reconcile',level:'info',title:`Check ${account.name} against its provider`,detail:checked?`Last reconciled ${checked}.`:'No balance reconciliation has been recorded yet.'})
  }

  const scoreGroups=new Map(),scoreDuplicates=new Map()
  for(const score of data.creditScores||[]){
    const series=[score.source,score.bureau,score.model].join('|'),exact=[series,score.date,score.score].join('|')
    scoreGroups.set(series,[...(scoreGroups.get(series)||[]),score]);scoreDuplicates.set(exact,(scoreDuplicates.get(exact)||0)+1)
  }
  if([...scoreDuplicates.values()].some(count=>count>1))issues.push({kind:'score',level:'warning',title:'Possible duplicate credit score',detail:'The same score, date, source, bureau and model appears more than once.'})
  for(const [series,values] of scoreGroups){
    const ordered=values.slice().sort((a,b)=>a.date.localeCompare(b.date))
    const jumps=ordered.slice(1).filter((score,index)=>dayDistance(score.date,ordered[index].date)<=45&&Math.abs(score.score-ordered[index].score)>=40)
    if(jumps.length)issues.push({kind:'score',level:'info',title:'Credit-score changes need context',detail:`${series.replaceAll('|',' · ')} has ${jumps.length} change${jumps.length===1?'':'s'} of 40+ points within 45 days. Verify that every entry belongs to the same score series.`})
  }

  const dated=[...(data.transactions||[]),...(data.payments||[]),...(data.billPayments||[])].map(transactionDay).filter(Boolean).sort()
  const months=new Map()
  for(const item of data.transactions||[]){const month=transactionDay(item).slice(0,7),summary=months.get(month)||{entries:0,income:0};summary.entries++;if(item.kind==='income')summary.income++;months.set(month,summary)}
  return {issues,coverage:{first:dated[0]||'',last:dated.at(-1)||'',months:[...months].sort(([a],[b])=>a.localeCompare(b)).map(([month,value])=>({month,...value}))}}
}
