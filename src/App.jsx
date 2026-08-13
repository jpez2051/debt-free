import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Banknote, BarChart3, Check, CreditCard, Home, Lightbulb, Pencil, Plus, ReceiptText, Sparkles, Target, WalletCards, X } from 'lucide-react'
import { orderDebts, projectedDate, simulatePayoff } from './lib/payoff.js'

const VERSION = '0.4.3'
const STORAGE_KEY = 'debt-free-v040'
const categories = ['Groceries','Dining','Fuel','Shopping','Subscriptions','Entertainment','Utilities','Health','Travel','Other']
const starter = {
  accounts: [
    { id:'checking', name:'Main Checking', type:'checking', balance:4200 },
    { id:'savings', name:'Savings', type:'savings', balance:8500 },
    { id:'visa', name:'Visa', type:'credit', balance:3200, apr:24.99, minimum:110, limit:7000 },
    { id:'mc', name:'Mastercard', type:'credit', balance:1450, apr:18.49, minimum:55, limit:5000 },
  ],
  transactions: [
    { id:'t1', date:new Date().toISOString(), merchant:'Groceries', amount:96.42, category:'Groceries', accountId:'visa', kind:'purchase', historical:false },
    { id:'t2', date:new Date().toISOString(), merchant:'Gas Station', amount:54.10, category:'Fuel', accountId:'checking', kind:'purchase', historical:false },
  ],
  payments: [], strategy:'avalanche', extra:250,
}
const money = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})
const money2 = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'})
const dateValue = () => new Date().toISOString().slice(0,10)
function load(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));return saved?{...starter,...saved,transactions:saved.transactions||[],payments:saved.payments||[],accounts:saved.accounts||[]}:starter}catch{return starter}}
function save(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
const nav = [['dashboard','Dashboard',Home],['accounts','Accounts',WalletCards],['transactions','Transactions',ReceiptText],['debts','Debts',CreditCard],['payoff','Payoff Plan',Target],['spending','Spending',BarChart3],['insights','Insights',Lightbulb]]

export default function App(){
  const [data,setData]=useState(load)
  const [page,setPage]=useState('dashboard')
  const [modal,setModal]=useState(null)
  const [form,setForm]=useState({})
  const update=next=>{setData(next);save(next)}
  const cashAccounts=data.accounts.filter(a=>a.type!=='credit')
  const checking=data.accounts.filter(a=>a.type==='checking')
  const cards=data.accounts.filter(a=>a.type==='credit')
  const cash=cashAccounts.reduce((s,a)=>s+Number(a.balance),0)
  const cardDebt=cards.reduce((s,a)=>s+Number(a.balance),0)
  const minimums=cards.reduce((s,a)=>s+Number(a.minimum||0),0)
  const payoffDebts=cards.map(a=>({id:a.id,name:a.name,balance:a.balance,apr:a.apr||0,minimum:a.minimum||0}))
  const plan=useMemo(()=>simulatePayoff(payoffDebts,data.extra,data.strategy),[data.accounts,data.extra,data.strategy])
  const alt=useMemo(()=>simulatePayoff(payoffDebts,data.extra,data.strategy==='avalanche'?'snowball':'avalanche'),[data.accounts,data.extra,data.strategy])
  const payoffDate=plan.paidOff?projectedDate(plan.months):null
  const purchases=data.transactions.filter(t=>t.kind==='purchase')
  const spend=purchases.reduce((s,t)=>s+Number(t.amount),0)
  const byCategory=categories.map(c=>({name:c,total:purchases.filter(t=>t.category===c).reduce((s,t)=>s+Number(t.amount),0)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total)
  const discretionary=byCategory.filter(x=>['Dining','Shopping','Subscriptions','Entertainment','Travel'].includes(x.name)).reduce((s,x)=>s+x.total,0)
  const top=byCategory[0]
  const account=id=>data.accounts.find(a=>a.id===id)
  const openPurchase=()=>{setForm({date:dateValue(),historical:false,category:'Groceries'});setModal('purchase')}
  const openPayment=()=>{setForm({date:dateValue(),historical:false,bankId:checking[0]?.id||cashAccounts[0]?.id||'',cardId:cards[0]?.id||''});setModal('payment')}
  const openAccountAdd=()=>{setForm({type:'checking'});setModal('account')}
  const openAccountEdit=a=>{setForm({...a});setModal('account')}

  const addPurchase=e=>{
    e.preventDefault()
    const amount=Number(form.amount), a=account(form.accountId)
    if(!a||!amount||amount<=0)return
    const historical=Boolean(form.historical)
    const accounts=historical?data.accounts:data.accounts.map(x=>x.id===a.id?{...x,balance:a.type==='credit'?Number(x.balance)+amount:Number(x.balance)-amount}:x)
    const tx={id:crypto.randomUUID(),date:new Date(`${form.date||dateValue()}T12:00:00`).toISOString(),merchant:(form.merchant||'Purchase').trim(),amount,category:form.category||'Other',accountId:a.id,kind:'purchase',historical}
    update({...data,accounts,transactions:[tx,...data.transactions]})
    setModal(null);setForm({})
  }

  const addPayment=e=>{
    e.preventDefault()
    const amount=Number(form.amount), card=account(form.cardId), bank=account(form.bankId)
    if(!card||!bank||card.type!=='credit'||bank.type==='credit'||!amount||amount<=0)return
    const historical=Boolean(form.historical)
    const actual=historical?amount:Math.min(amount,Number(card.balance))
    const accounts=historical?data.accounts:data.accounts.map(a=>a.id===card.id?{...a,balance:Math.max(0,Number(a.balance)-actual)}:a.id===bank.id?{...a,balance:Number(a.balance)-actual}:a)
    const p={id:crypto.randomUUID(),date:new Date(`${form.date||dateValue()}T12:00:00`).toISOString(),cardId:card.id,cardName:card.name,bankId:bank.id,bankName:bank.name,amount:actual,kind:'payment',historical}
    update({...data,accounts,payments:[p,...data.payments]})
    setModal(null);setForm({})
  }

  const saveAccount=e=>{
    e.preventDefault()
    if(!form.name?.trim())return
    const item={id:form.id||crypto.randomUUID(),name:form.name.trim(),type:form.type||'checking',balance:Number(form.balance||0),apr:Number(form.apr||0),minimum:Number(form.minimum||0),limit:Number(form.limit||0)}
    const accounts=form.id?data.accounts.map(a=>a.id===form.id?item:a):[...data.accounts,item]
    update({...data,accounts});setModal(null);setForm({})
  }

  const choose=s=>update({...data,strategy:s})
  const setExtra=v=>update({...data,extra:Number(v||0)})

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="mark"><Target size={20}/></div><div><strong>Debt Free</strong><span>v{VERSION}</span></div></div><nav>{nav.map(([id,label,Icon])=><button key={id} className={page===id?'nav active':'nav'} onClick={()=>setPage(id)}><Icon size={17}/>{label}</button>)}</nav><div className="side-foot"><Sparkles size={15}/><span>Finance assistant mode</span></div></aside>
    <div className="workspace"><header><div><span className="kicker">PERSONAL FINANCE OS</span><h1>{nav.find(n=>n[0]===page)?.[1]}</h1><span className="version-chip">Debt Free v{VERSION}</span></div><div className="header-actions"><button className="secondary" onClick={openPurchase}><ReceiptText size={16}/> Log purchase</button><button className="primary" onClick={openPayment}><Banknote size={16}/> Card payment</button></div></header><main>
      {page==='dashboard'&&<><section className="hero-card"><div><span className="kicker">FINANCIAL SNAPSHOT</span><h2>See where you stand. Decide what moves next.</h2><p>Cash, debt, spending and payoff progress in one view.</p></div><div><span>Projected debt-free</span><strong>{payoffDate?payoffDate.toLocaleDateString('en-US',{month:'long',year:'numeric'}):'Needs a plan'}</strong><small>{plan.months} months · {money.format(plan.interest)} projected interest</small></div></section><section className="stats four"><Stat label="Available cash" value={money.format(cash)} note={`${cashAccounts.length} bank account(s)`}/><Stat label="Credit card debt" value={money.format(cardDebt)} note={`${cards.length} card(s)`}/><Stat label="Spending logged" value={money.format(spend)} note={`${purchases.length} purchase(s), including history`}/><Stat label="Monthly debt plan" value={money.format(minimums+data.extra)} note={`${money.format(data.extra)} extra`}/></section><section className="two-col"><Panel title="Recent activity" kicker="MONEY MOVEMENT">{purchases.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5).map(t=><Row key={t.id} left={`${t.merchant} · ${t.category}`} right={`-${money2.format(t.amount)}`} sub={`${account(t.accountId)?.name||'Unknown'}${t.historical?' · historical':''}`}/>)}</Panel><Panel title="Assistant pulse" kicker="WHAT MATTERS NOW"><Insight text={top?`${top.name} is your largest logged spending category at ${money.format(top.total)}.`:'Log purchases to unlock spending insights.'}/><Insight text={discretionary>0?`You have ${money.format(discretionary)} in discretionary spending logged. Historical entries improve this picture without changing current balances.`:'No discretionary spending logged yet.'}/><Insight text={cash<minimums*2?'Your cash cushion is tight relative to monthly card minimums.':'Your current cash balance covers more than two months of card minimums.'}/></Panel></section></>}
      {page==='accounts'&&<PageHead title="Accounts" text="Current bank balances and cards are your live financial position." action="Add account" onClick={openAccountAdd}>{data.accounts.map(a=><div className="account-card" key={a.id}><div><span>{a.type}</span><strong>{a.name}</strong></div><b>{a.type==='credit'?money.format(a.balance)+' owed':money.format(a.balance)}</b><div className="account-tail">{a.type==='credit'&&<small>{a.apr}% APR · {money.format(a.minimum)} minimum · {a.limit?Math.round(a.balance/a.limit*100):0}% utilization</small>}<button type="button" className="icon-button" aria-label={`Edit ${a.name}`} title="Edit account" onClick={()=>openAccountEdit(a)}><Pencil size={15}/></button></div></div>)}</PageHead>}
      {page==='transactions'&&<PageHead title="Transactions" text="Current and historical purchases contribute to spending analysis." action="Log purchase" onClick={openPurchase}><div className="table-list">{purchases.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=><Row key={t.id} left={`${t.merchant} · ${t.category}${t.historical?' · Historical':''}`} right={money2.format(t.amount)} sub={`${new Date(t.date).toLocaleDateString()} · ${account(t.accountId)?.name||'Unknown account'}`}/>)}</div></PageHead>}
      {page==='debts'&&<PageHead title="Debts" text="Current balances drive your payoff plan; historical payments inform your payment habits." action="Log card payment" onClick={openPayment}>{orderDebts(payoffDebts,data.strategy).map((d,i)=><div className="debt-row" key={d.id}><div className="rank">{i+1}</div><div><strong>{d.name}</strong><small>{d.apr}% APR · {money.format(d.minimum)} minimum</small></div><b>{money.format(d.balance)}</b></div>)}<Panel title="Payment history" kicker="TRANSFERS FROM BANK">{data.payments.length?data.payments.slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(p=><Row key={p.id} left={`${p.bankName} → ${p.cardName}${p.historical?' · Historical':''}`} right={money2.format(p.amount)} sub={new Date(p.date).toLocaleDateString()}/>):<Empty/>}</Panel></PageHead>}
      {page==='payoff'&&<><PageHead title="Payoff Plan" text="Only current balances affect projections; historical entries never distort your live debt."/><section className="two-col"><Panel title="Choose your method" kicker="STRATEGY"><button className={data.strategy==='avalanche'?'choice active':'choice'} onClick={()=>choose('avalanche')}><ArrowDown size={16}/> Avalanche <span>Highest APR first</span>{data.strategy==='avalanche'&&<Check size={16}/>}</button><button className={data.strategy==='snowball'?'choice active':'choice'} onClick={()=>choose('snowball')}><ArrowUp size={16}/> Snowball <span>Smallest balance first</span>{data.strategy==='snowball'&&<Check size={16}/>}</button><label className="field">Extra each month<div className="money-input"><span>$</span><input style={{fontSize:16}} type="number" min="0" value={data.extra} onChange={e=>setExtra(e.target.value)}/></div></label></Panel><Panel title="Projection" kicker="FINISH LINE"><div className="big-number">{payoffDate?payoffDate.toLocaleDateString('en-US',{month:'long',year:'numeric'}):'—'}</div><Row left="Months remaining" right={String(plan.months)}/><Row left="Projected interest" right={money.format(plan.interest)}/><Row left="Difference vs alternative" right={money.format(Math.abs(plan.interest-alt.interest))}/></Panel></section></>}
      {page==='spending'&&<PageHead title="Spending" text="Historical purchases are included so your habits become clearer over time."><section className="two-col"><Panel title="By category" kicker="WHERE MONEY WENT">{byCategory.length?byCategory.map(x=><div className="category" key={x.name}><span>{x.name}</span><div><i style={{width:`${Math.max(6,(x.total/byCategory[0].total)*100)}%`}}/></div><b>{money.format(x.total)}</b></div>):<Empty/>}</Panel><Panel title="Discretionary opportunity" kicker="POTENTIAL PAYOFF FUEL"><div className="big-number">{money.format(discretionary)}</div><p className="muted">Dining, shopping, subscriptions, entertainment and travel currently logged.</p><p className="muted">Redirecting even 25% would add about <strong>{money.format(discretionary*.25)}</strong> to debt payoff.</p></Panel></section></PageHead>}
      {page==='insights'&&<PageHead title="Insights" text="The more history you add, the better Debt Free can understand your patterns."><div className="insight-grid"><Insight text={top?`Your top category is ${top.name} at ${money.format(top.total)}. Review recent ${top.name.toLowerCase()} purchases for easy cuts.`:'Start logging purchases to get category-specific suggestions.'}/><Insight text={cards.some(c=>c.limit&&c.balance/c.limit>.5)?'At least one card is above 50% utilization. Prioritizing that balance can improve your debt profile.':'No logged card is currently above 50% utilization.'}/><Insight text={data.payments.length?`You have logged ${data.payments.length} card payment(s) totaling ${money.format(data.payments.reduce((s,p)=>s+Number(p.amount),0))}. Historical payments do not alter current balances.`:'Log current or historical card payments to understand your repayment habits.'}/><Insight text={discretionary?`Cutting 25% of discretionary spending would free about ${money.format(discretionary*.25)} based on everything currently logged.`:'Once discretionary purchases are logged, Debt Free can suggest payoff opportunities.'}/></div></PageHead>}
    </main></div>

    {modal&&<div className="modal-backdrop" onMouseDown={()=>setModal(null)}><form className="modal" onSubmit={modal==='purchase'?addPurchase:modal==='payment'?addPayment:saveAccount} onMouseDown={e=>e.stopPropagation()}>
      <button type="button" className="close" onClick={()=>setModal(null)}><X/></button>
      <span className="kicker">{modal==='purchase'?'TRANSACTION':modal==='payment'?'DEBT PAYMENT':form.id?'EDIT ACCOUNT':'NEW ACCOUNT'}</span>
      <h2>{modal==='purchase'?'Log a purchase':modal==='payment'?'Log a card payment':form.id?'Edit account':'Add an account'}</h2>
      {modal!=='account'&&<div className="entry-mode"><button type="button" className={!form.historical?'active':''} onClick={()=>setForm({...form,historical:false})}>Current activity</button><button type="button" className={form.historical?'active':''} onClick={()=>setForm({...form,historical:true})}>Historical entry</button></div>}
      {modal!=='account'&&<p className="modal-note">{form.historical?'Historical mode records activity for spending/payment insights but does not change any current account or card balance.':'Current mode updates your live balances automatically.'}</p>}
      {modal==='purchase'&&<><label>Date<input type="date" value={form.date||dateValue()} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Merchant<input value={form.merchant||''} onChange={e=>setForm({...form,merchant:e.target.value})} placeholder="Where did you spend?"/></label><label>Amount<input type="number" inputMode="decimal" step=".01" min=".01" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Paid with<select value={form.accountId||''} onChange={e=>setForm({...form,accountId:e.target.value})}><option value="">Choose account</option>{data.accounts.filter(a=>a.type!=='savings').map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label><label>Category<select value={form.category||'Groceries'} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></>}
      {modal==='payment'&&<><label>Date<input type="date" value={form.date||dateValue()} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Paid from<select value={form.bankId||''} onChange={e=>setForm({...form,bankId:e.target.value})}>{cashAccounts.map(a=><option value={a.id} key={a.id}>{a.name} — {money.format(a.balance)}</option>)}</select></label><label>Credit card<select value={form.cardId||''} onChange={e=>setForm({...form,cardId:e.target.value})}>{cards.map(a=><option value={a.id} key={a.id}>{a.name} — {money.format(a.balance)} owed</option>)}</select></label><label>Payment amount<input type="number" inputMode="decimal" step=".01" min=".01" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/></label></>}
      {modal==='account'&&<><label>Name<input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Type<select value={form.type||'checking'} onChange={e=>setForm({...form,type:e.target.value})}><option value="checking">Checking</option><option value="savings">Savings</option><option value="credit">Credit card</option></select></label><label>Current balance<input type="number" inputMode="decimal" step=".01" value={form.balance??''} onChange={e=>setForm({...form,balance:e.target.value})}/></label>{form.type==='credit'&&<div className="form-row"><label>APR %<input type="number" inputMode="decimal" step=".01" value={form.apr??''} onChange={e=>setForm({...form,apr:e.target.value})}/></label><label>Minimum<input type="number" inputMode="decimal" step=".01" value={form.minimum??''} onChange={e=>setForm({...form,minimum:e.target.value})}/></label><label>Limit<input type="number" inputMode="decimal" step=".01" value={form.limit??''} onChange={e=>setForm({...form,limit:e.target.value})}/></label></div>}</>}
      <button className="primary submit">{modal==='purchase'?(form.historical?'Save historical purchase':'Log purchase'):modal==='payment'?(form.historical?'Save historical payment':'Log payment'):form.id?'Save changes':'Add account'}</button>
    </form></div>}
  </div>
}

function Stat({label,value,note}){return <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}
function Panel({title,kicker,children}){return <section className="panel content-panel"><span className="kicker">{kicker}</span><h2>{title}</h2>{children}</section>}
function Row({left,right,sub}){return <div className="row"><div><strong>{left}</strong>{sub&&<small>{sub}</small>}</div><b>{right}</b></div>}
function Insight({text}){return <div className="insight-card"><div><Sparkles size={15}/></div><p>{text}</p></div>}
function Empty(){return <div className="empty">Nothing logged yet.</div>}
function PageHead({title,text,action,onClick,children}){return <><div className="page-head"><div><h2>{title}</h2><p>{text}</p></div>{action&&<button className="primary" onClick={onClick}><Plus size={16}/>{action}</button>}</div>{children}</>}
