const clone = value => structuredClone(value)

function aliaser(prefix){
  const aliases=new Map()
  return value=>{
    const clean=String(value||'').trim(),key=clean.toLocaleLowerCase()
    if(!key)return `${prefix} unknown`
    if(!aliases.has(key))aliases.set(key,`${prefix} ${aliases.size+1}`)
    return aliases.get(key)
  }
}

export function anonymizeDiagnosticData(source){
  const data=clone(source),accountNames=new Map(),billNames=new Map()
  const nextMerchant=aliaser('Merchant'),nextIncome=aliaser('Income source'),nextReason=aliaser('Adjustment reason')
  let cash=0,card=0
  data.accounts=(data.accounts||[]).map(account=>{
    const label=account.type==='credit'?`Credit Card ${++card}`:`Cash Account ${++cash}`
    accountNames.set(account.id,label)
    return {...account,name:label}
  })
  data.bills=(data.bills||[]).map((bill,index)=>{
    const label=`Recurring Bill ${index+1}`
    billNames.set(bill.id,label)
    return {...bill,name:label}
  })
  data.transactions=(data.transactions||[]).map(item=>({...item,merchant:item.kind==='income'?nextIncome(item.merchant):item.toAccountId?accountNames.get(item.toAccountId)||'Cash Account unknown':nextMerchant(item.merchant)}))
  data.payments=(data.payments||[]).map(item=>({...item,cardName:accountNames.get(item.cardId)||'Credit Card unknown',bankName:accountNames.get(item.bankId)||'Cash Account unknown'}))
  data.billPayments=(data.billPayments||[]).map(item=>({...item,billName:billNames.get(item.billId)||'Recurring Bill unknown',bankName:accountNames.get(item.bankId)||'Account unknown'}))
  data.adjustments=(data.adjustments||[]).map(item=>({...item,reason:nextReason(item.reason)}))
  return data
}

export function diagnosticPayload(data,{version,exportedAt=new Date().toISOString()}={}){
  return {
    schema:'debt-free-anonymized-diagnostic-v1',
    app:'Debt Free',
    version,
    exportedAt,
    restoreCompatible:false,
    privacyNotice:'Names are replaced, but amounts, dates, categories, balances, credit scores, and financial relationships remain sensitive.',
    data:anonymizeDiagnosticData(data),
  }
}
