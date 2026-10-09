// Synthetic, isolated browser fixture. This page never reads or saves cloud data.
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from '../../src/App.jsx'
import AdaptiveNav from '../../src/AdaptiveNav.jsx'
import '../../src/styles.css'
import { dueInMonth, localDate } from '../../src/lib/finance.js'

const now=new Date(),today=localDate(now),current=dueInMonth(now.getFullYear(),now.getMonth(),6),next=dueInMonth(now.getFullYear(),now.getMonth()+1,6)
document.documentElement.dataset.debtMode=new URLSearchParams(location.search).get('theme')||'dark'
const fixture={financeVersion:1,accounts:[{id:'bank',name:'Test Checking',type:'checking',balance:97},{id:'card',name:'Test Card',type:'credit',balance:400,minimum:25,apr:20,nextDueDate:today}],transactions:[{id:'transfer',kind:'transfer',accountId:'bank',toAccountId:'',transferPurpose:'Savings contribution',merchant:'Subscription provider',amount:3,date:new Date(`${today}T12:00:00`).toISOString(),localDate:today,historical:false,category:'Transfer',subcategory:''}],payments:[],bills:[{id:'bill',name:'Test Subscription',amount:3,dueDay:6,nextDueDate:next,frequency:'monthly',active:true,autopay:true,accountId:'bank',category:'Subscriptions',subcategory:'Memberships'}],billCycles:[{id:'current',billId:'bill',dueDate:current,expectedAmount:3,actualAmount:null},{id:'next',billId:'bill',dueDate:next,expectedAmount:3,actualAmount:3}],billPayments:[{id:'mistake',billId:'bill',billName:'Test Subscription',cycleId:'next',amount:3,bankId:'bank',bankName:'Test Checking',fundingType:'checking',date:new Date(`${today}T12:00:00`).toISOString(),localDate:today,historical:true,category:'Subscriptions',subcategory:'Memberships'}],extra:0,strategy:'avalanche'}
createRoot(document.getElementById('root')).render(<><App initialData={fixture} persist={async data=>{window.billTestSaved=data}}/><AdaptiveNav/></>)
