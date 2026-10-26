import {trackedObligations,statementTotals} from './finance.js'
export function cardStatementAction(data,card,now=new Date()){
 const items=trackedObligations(data,now).filter(item=>item.cardId===card.id),visible=items.find(item=>item.remaining>0)||items.at(-1)
 const target=data.cardStatements.find(s=>s.id===visible?.statementId&&s.cardId===card.id)
 if(!target)return Number(card.balance)>0?{kind:'statement',cardId:card.id,label:'Add statement'}:null
 const remaining=statementTotals(target,data.payments,now).remaining
 if(remaining>0&&data.payments.some(p=>p.cardId===card.id&&p.assignmentStatus==='unassigned'&&p.status!=='pending'))return {kind:'assignments',cardId:card.id,label:'Review payments'}
 if(target.needsReview||remaining>0)return {kind:'statement',cardId:card.id,statementId:target.id,label:'Review statement'}
 return null
}
export function contextActionDraft(data,request){
 if(request.kind==='reconcile'){
  const account=data.accounts.find(a=>a.id===request.accountId)
  if(!account)throw Error('This account no longer exists. Review the latest Accounts page.')
  return {mode:'reconcile',form:{accountId:account.id,balance:account.balance,reason:''}}
 }
 if(request.kind==='statement'){
  const card=data.accounts.find(a=>a.id===request.cardId&&a.type==='credit')
  if(!card)throw Error('Choose a card that still exists.')
  if(request.statementId){const statement=data.cardStatements.find(s=>s.id===request.statementId&&s.cardId===card.id);if(!statement)throw Error('This statement no longer exists. Review the latest statements.');return {mode:'statement',form:statement}}
  return {mode:'statement',form:{cardId:card.id,dueDate:'',minimum:'',closingDate:''}}
 }
 throw Error('This action is no longer available.')
}
