import { cents, localDate, statementTotals } from './finance.js'

export function decisionSafety(data,{today,end,unassigned=0,shortfall=false}){
  const reasons=[],notes=[]
  const recent=value=>{const age=(new Date(`${today}T12:00:00`)-new Date(value))/86400000;return value&&Number.isFinite(age)&&age>=-1&&age<=30}
  for(const bank of data.accounts.filter(a=>a.type==='checking'))if(!recent(bank.reconciledAt))reasons.push(`${bank.name}: check its balance against your bank (no check in the last 30 days).`)
  for(const card of data.accounts.filter(a=>a.type==='credit')){
    const active=(data.cardStatements||[]).filter(s=>s.cardId===card.id&&!s.supersededBy).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))
    if(cents(card.balance)<=0){if(active.some(s=>s.dueDate<=end&&statementTotals(s,data.payments||[],new Date(`${today}T12:00:00`)).remaining>0))reasons.push(`${card.name}: a recorded statement is unpaid despite a zero/credit balance. Check it with the issuer.`);continue}
    const next=active.find(s=>s.dueDate>=today)
    if(!next)reasons.push(`${card.name}: record the next statement minimum and due date.`)
    else if(next.needsReview||next.verification!=='issuer-confirmed')reasons.push(`${card.name}: confirm its statement against the issuer.`)
    const relevant=active.filter(s=>s.dueDate<=end&&(s.dueDate>=today||s.needsReview||statementTotals(s,data.payments||[],new Date(`${today}T12:00:00`)).remaining>0))
    if(relevant.some(s=>s.needsReview||s.verification!=='issuer-confirmed')&&!reasons.some(r=>r.startsWith(`${card.name}:`)))reasons.push(`${card.name}: a statement in this reserve window needs confirmation.`)
    if(next){const due=new Date(`${next.dueDate}T12:00:00`),day=due.getDate();due.setDate(1);due.setMonth(due.getMonth()+1);due.setDate(Math.min(day,new Date(due.getFullYear(),due.getMonth()+1,0).getDate()));if(localDate(due)<=end&&!active.some(s=>s.dueDate>next.dueDate&&s.dueDate<=end))reasons.push(`${card.name}: another billing cycle falls inside this window but has no recorded statement.`)}
  }
  if(unassigned>0)reasons.push('Choose a checking account for every card minimum in this window; pooled balances are not a payment source.')
  if(shortfall)reasons.push('At least one checking account cannot cover its assigned dues. Review funding or record an actual transfer first.')
  for(const bill of data.bills.filter(b=>b.active!==false))if(!bill.accountId)reasons.push(`${bill.name}: choose its payment account.`)
  const estimated=(data.billCycles||[]).filter(c=>c.dueDate>=today&&c.dueDate<=end&&c.actualAmount==null)
  if(estimated.length)notes.push(`${estimated.length} bill invoice amount(s) are estimates; actual charges may differ.`)
  notes.push('Recorded balances and known dues only. Pending bank transactions and unlogged costs are not detected automatically.')
  return {ready:reasons.length===0,reasons,notes,label:reasons.length?'Needs review — extra-payment estimate withheld':'Recorded inputs checked — still an estimate'}
}
