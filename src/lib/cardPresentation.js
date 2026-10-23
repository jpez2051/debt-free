import { accountBalances } from './accountBalances.js'
import { cents, statementTotals } from './finance.js'

// A zero balance is a snapshot, not proof of a closed card or a paid statement.
export function zeroBalanceCardState(data,card,now=new Date()) {
  if(cents(card.balance)!==0)return null
  const statements=(data.cardStatements||[]).filter(s=>s.cardId===card.id&&!s.supersededBy).sort((a,b)=>b.dueDate.localeCompare(a.dueDate))
  const unpaid=statements.find(s=>statementTotals(s,data.payments||[],now).remaining>0)
  const lastPaid=statements.find(s=>!s.needsReview&&statementTotals(s,data.payments||[],now).remaining===0)
  const pending=accountBalances(data,card.id).pendingDebt
  const recurring=(data.bills||[]).filter(b=>b.active!==false&&b.accountId===card.id)
  return {
    label:unpaid?'Check statement':pending>0?'$0 posted · pending charges':'$0 balance today',
    lastDue:lastPaid?.dueDate||'',
    detail:unpaid
      ?`The balance is $0, but the statement due ${unpaid.dueDate} still shows an unpaid minimum. Check the payment assignment or issuer statement.`
      :`${pending>0?`Pending charges: ${pending.toFixed(2)}. `:''}${lastPaid?`Minimum met for ${lastPaid.dueDate}. `:'No paid statement recorded. '}${recurring.length?`${recurring.length} recurring charge${recurring.length===1?' is':'s are'} still scheduled on this card.`:'No recurring charges are scheduled on this card.'}`,
    recurringCount:recurring.length,
    unpaidStatementId:unpaid?.id||'',
  }
}
