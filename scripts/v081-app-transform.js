function replaceOrThrow(code,before,after,label){if(!code.includes(before))throw new Error(`v0.8.1 transform failed: ${label}`);return code.replace(before,after)}
export function transformAppV081(source){
  let code=replaceOrThrow(source,"const VERSION='0.8.0'","const VERSION='0.8.1'",'version')
  code=replaceOrThrow(code,"right={item.kind==='card'&&!item.remaining?'Paid':money.format(item.remaining)}","right={item.kind==='card'?(item.remaining?`${money.format(item.remaining)} due`:'Minimum met ✓'):money.format(item.remaining)}",'card obligation status')
  return replaceOrThrow(code,"${item.paid?`${money.format(item.paid)} paid · `:''}Due", "${item.actualPaid?`${money.format(item.actualPaid)} paid · `:''}Due",'actual card payment detail')
}
