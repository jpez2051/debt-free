// UI review only: no Firebase sign-in, reads, writes, or real records.
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from '../../src/App.jsx'
import SettingsCenter from '../../src/SettingsCenter.jsx'
import AdaptiveNav from '../../src/AdaptiveNav.jsx'
import { localDate, prepareData } from '../../src/lib/finance.js'
import { setCloudSession } from '../../src/lib/cloudState.js'
import '../../src/styles.css'
import '../../src/product-refinements.css'

const now=new Date(),today=localDate(now),day=(offset)=>localDate(new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset,12)),prior=localDate(new Date(now.getFullYear(),now.getMonth()-1,10,12))
const data=prepareData({financeVersion:1,accounts:[
 {id:'bank',name:'Everyday Checking',type:'checking',balance:2400,reconciledAt:now.toISOString()},
 {id:'savings',name:'Emergency Savings',type:'savings',balance:500},
 {id:'small',name:'Everyday Rewards Card',type:'credit',balance:900,minimum:40,apr:26,limit:2000,nextDueDate:day(7)},
 {id:'large',name:'Travel Rewards Card',type:'credit',balance:17000,minimum:500,apr:24.5,limit:22000,nextDueDate:day(10)},
 {id:'paid',name:'Paid-Off Card',type:'credit',balance:0,minimum:80,apr:20,limit:4000}],
 cardStatements:[{id:'small-cycle',cardId:'small',dueDate:day(7),minimum:40,verification:'issuer-confirmed',needsReview:false},{id:'large-cycle',cardId:'large',dueDate:day(10),minimum:500,verification:'issuer-confirmed',needsReview:false}],
 transactions:[{id:'income',accountId:'bank',merchant:'Example Employer',kind:'income',amount:2200,date:day(-8),localDate:day(-8),historical:true},...Array.from({length:30},(_,i)=>({id:'expense-'+i,accountId:i%2?'bank':'small',merchant:['Coffee & Snacks','Grocery Market','Fuel Station','Online Store'][i%4],kind:'purchase',amount:10+i*3.15,date:day(-i),localDate:day(-i),category:['Food & Drink','Food & Drink','Transportation','Shopping & Personal'][i%4],subcategory:['Coffee & Snacks','Groceries','Fuel','Clothing & Accessories'][i%4],historical:true})),{id:'pending',accountId:'bank',merchant:'Pending Groceries',kind:'purchase',amount:45,date:today,localDate:today,category:'Food & Drink',subcategory:'Groceries',status:'pending',historical:false}],
 payments:[],bills:[{id:'music',name:'Music Subscription',amount:20.89,frequency:'monthly',dueDay:6,nextDueDate:day(3),accountId:'small',category:'Subscriptions',subcategory:'Music & Audio',active:true},{id:'phone',name:'Phone Service',amount:65,frequency:'monthly',dueDay:25,nextDueDate:day(12),accountId:'bank',category:'Bills & Utilities',active:true}],
 billPayments:[],creditScores:[{id:'score-1',source:'Aura',bureau:'Equifax',model:'VantageScore 3.0',score:710,date:today},{id:'score-2',source:'Aura',bureau:'Equifax',model:'VantageScore 3.0',score:700,date:prior},{id:'score-3',source:'Credit Karma',bureau:'TransUnion',model:'VantageScore 3.0',score:685,date:today}],incomeSchedules:[{id:'pay',name:'Paycheck',amount:2200,accountId:'bank',frequency:'biweekly',nextDate:day(8),active:true}],strategy:'avalanche',extra:100,completedMonths:[prior.slice(0,7)]},now)
setCloudSession({status:'ready',user:{uid:'synthetic-ui-review',displayName:'Synthetic UI review'},saveStatus:'saved',sync:'Synthetic data only — no cloud connection',actions:{privacyCapabilities:async()=>({accountDeletion:false,cleanup:false})}})
createRoot(document.getElementById('root')).render(<><p className="sync-status">Synthetic UI review only — no Firebase connection or real records.</p><App initialData={data}/><SettingsCenter/><AdaptiveNav/></>)
