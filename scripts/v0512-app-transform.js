function replaceOrThrow(code,before,after,label){if(!code.includes(before))throw new Error(`v0.5.12 transform failed: ${label}`);return code.replace(before,after)}

export function transformAppV0512(source){
 let code=source
 code=replaceOrThrow(code,"const VERSION='0.5.11'","const VERSION='0.5.12'",'version')
 code=replaceOrThrow(code,"merchant:(form.merchant||(kind==='income'?'Income':'Purchase')).trim()","merchant:(form.merchant||(kind==='income'?'Income':'Expense')).trim()",'default expense name')
 code=replaceOrThrow(code,"> Purchase</button>","> Expense</button>",'header expense action')
 code=replaceOrThrow(code,"['Purchases',spend]","['Expenses',spend]",'expense flow label')
 code=replaceOrThrow(code,"Income, purchases and external transfers stay separate so spending totals remain accurate.","Income, expenses and external transfers stay separate so spending totals remain accurate.",'activity description')
 code=replaceOrThrow(code,"> Add purchase</button>","> Add expense</button>",'activity expense action')
 code=replaceOrThrow(code,"form.id?'Edit purchase':'Log purchase'","form.id?'Edit expense':'Add expense'",'expense modal title')
 code=replaceOrThrow(code,"Log purchases to unlock category-specific insights.","Add expenses to unlock category-specific insights.",'dashboard empty insight')
 code=replaceOrThrow(code,"Once discretionary purchases are logged, Debt Free can quantify payoff opportunities.","Once discretionary expenses are logged, Debt Free can quantify payoff opportunities.",'insights empty state')
 return code
}
