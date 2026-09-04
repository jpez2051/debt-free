export const CATEGORY_GROUPS=[
  {name:'Food & Drink',subcategories:['Groceries','Restaurants & Takeout','Fast Food','Coffee & Snacks','Other Food & Drink']},
  {name:'Transportation',subcategories:['Fuel','Parking & Tolls','Repairs & Maintenance','Transit & Rideshare','Other Transportation']},
  {name:'Shopping & Personal',subcategories:['General Shopping','Household','Clothing','Personal Care','Gifts','Other Shopping & Personal']},
  {name:'Bills & Utilities',subcategories:['Utilities','Phone & Internet','Home Services','Taxes','Other Bills & Utilities']},
  {name:'Subscriptions',subcategories:['Streaming','Software & Apps','Memberships','Other Subscription']},
  {name:'Entertainment',subcategories:['Events & Activities','Games','Hobbies','Other Entertainment']},
  {name:'Housing',subcategories:['Rent or Mortgage','Maintenance & Repairs','Furnishings','Other Housing']},
  {name:'Health',subcategories:['Medical','Pharmacy','Dental & Vision','Fitness','Other Health']},
  {name:'Insurance',subcategories:['Auto Insurance','Health Insurance','Home or Renters Insurance','Life Insurance','Other Insurance']},
  {name:'Travel',subcategories:['Airfare','Lodging','Ground Transportation','Food While Traveling','Other Travel']},
  {name:'Debt Costs',subcategories:['Interest','Fees','Other Debt Cost']},
  {name:'Education',subcategories:['Tuition','Books & Supplies','Courses','Other Education']},
  {name:'Other',subcategories:['Other']},
]

export const DEFAULT_EXPENSE_CATEGORY={category:'Food & Drink',subcategory:'Groceries'}
export const DEFAULT_BILL_CATEGORY={category:'Bills & Utilities',subcategory:'Utilities'}
export const DEFAULT_OTHER_CATEGORY={category:'Other',subcategory:'Other'}
export const TRANSFER_PURPOSES=['Savings contribution','Investment contribution','Account transfer','Other transfer']

const legacy={
  Groceries:DEFAULT_EXPENSE_CATEGORY,
  Dining:{category:'Food & Drink',subcategory:'Restaurants & Takeout'},
  Fuel:{category:'Transportation',subcategory:'Fuel'},
  Shopping:{category:'Shopping & Personal',subcategory:'General Shopping'},
  Subscriptions:{category:'Subscriptions',subcategory:'Other Subscription'},
  Entertainment:{category:'Entertainment',subcategory:'Other Entertainment'},
  Utilities:DEFAULT_BILL_CATEGORY,
  Health:{category:'Health',subcategory:'Other Health'},
  Travel:{category:'Travel',subcategory:'Other Travel'},
  Housing:{category:'Housing',subcategory:'Other Housing'},
  Insurance:{category:'Insurance',subcategory:'Other Insurance'},
  Interest:{category:'Debt Costs',subcategory:'Interest'},
  Other:DEFAULT_OTHER_CATEGORY,
}

const group=name=>CATEGORY_GROUPS.find(item=>item.name===name)
export const categorySubcategories=name=>group(name)?.subcategories||CATEGORY_GROUPS.at(-1).subcategories

export function categorySelection(entry={}){
  const raw=String(entry.category||'').trim(),mapped=legacy[raw]
  if(mapped)return {...mapped}
  const found=group(raw)
  if(found){
    const detail=String(entry.subcategory||'').trim()
    return {category:found.name,subcategory:found.subcategories.includes(detail)?detail:found.subcategories.at(-1)}
  }
  return {category:'Other',subcategory:raw&&raw!=='Other'?raw:'Other'}
}

export function categoryLabel(entry){
  const {category,subcategory}=categorySelection(entry)
  return category===subcategory?category:`${category} · ${subcategory}`
}

export const categorizeSpendingEntry=entry=>({...entry,...categorySelection(entry)})
export const isSavedOrInvestedTransfer=entry=>entry?.kind==='transfer'&&['Savings contribution','Investment contribution'].includes(entry.transferPurpose)

export function isDiscretionaryEntry(entry){
  const {category,subcategory}=categorySelection(entry)
  return category==='Subscriptions'||category==='Entertainment'||category==='Travel'||category==='Shopping & Personal'||(category==='Food & Drink'&&subcategory!=='Groceries')
}

export function merchantProfiles(entries){
  const merchants=new Map()
  for(const entry of entries||[]){
    if(entry.kind&&entry.kind!=='purchase')continue
    const name=String(entry.merchant||'').trim()
    if(!name)continue
    const key=name.toLocaleLowerCase(),selection=categorySelection(entry),choiceKey=`${selection.category}\u0000${selection.subcategory}`,last=new Date(entry.date).getTime()||0
    const merchant=merchants.get(key)||{name,count:0,last:0,choices:new Map()}
    merchant.count++;merchant.last=Math.max(merchant.last,last)
    const choice=merchant.choices.get(choiceKey)||{...selection,count:0,last:0}
    choice.count++;choice.last=Math.max(choice.last,last);merchant.choices.set(choiceKey,choice);merchants.set(key,merchant)
  }
  return [...merchants.values()].map(merchant=>{
    const choice=[...merchant.choices.values()].sort((a,b)=>b.count-a.count||b.last-a.last||a.category.localeCompare(b.category))[0]
    return {name:merchant.name,count:merchant.count,last:merchant.last,category:choice.category,subcategory:choice.subcategory}
  }).sort((a,b)=>b.count-a.count||b.last-a.last||a.name.localeCompare(b.name))
}
