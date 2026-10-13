import { cents, dollars } from './finance.js'
export function accountBalances(data,id){
  const account=data.accounts.find(a=>a.id===id);if(!account)return {cleared:0,pendingOut:0,pendingDebt:0,working:0}
  const entries=[...(data.transactions||[]).filter(t=>t.accountId===id).map(t=>({...t,source:'transaction'})),...(data.payments||[]).filter(p=>p.bankId===id||p.cardId===id).map(p=>({...p,source:'payment'})),...(data.billPayments||[]).filter(p=>p.bankId===id).map(p=>({...p,source:'bill'}))].filter(item=>item.status==='pending'&&!item.historical)
  const outgoing=entries.filter(e=>e.source!=='transaction'||['purchase','transfer'].includes(e.kind)).reduce((sum,e)=>sum+cents(e.amount),0)
  const debt=entries.filter(e=>e.source==='bill'||e.source==='transaction'&&e.kind==='purchase').reduce((sum,e)=>sum+cents(e.amount),0)
  return {cleared:Number(account.balance),pendingOut:account.type==='credit'?0:dollars(outgoing),pendingDebt:account.type==='credit'?dollars(debt):0,working:dollars(cents(account.balance)+(account.type==='credit'?debt:-outgoing))}
}
