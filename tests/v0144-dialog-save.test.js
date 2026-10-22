import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dialogValidationMessage } from '../src/lib/dialogValidation.js'
import { prepareData,saveStatement } from '../src/lib/finance.js'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

test('invalid offscreen fields get focused, scrolled into view and named in save feedback',()=>{
 const calls=[],control={labels:[{textContent:'Original minimum due'}],validationMessage:'Enter a valid value.',focus:o=>calls.push(['focus',o]),scrollIntoView:o=>calls.push(['scroll',o])}
 assert.equal(dialogValidationMessage({checkValidity:()=>false,querySelector:selector=>{assert.equal(selector,':invalid');return control}}),'Original minimum due: Enter a valid value.')
 assert.equal(calls.length,2)
 const details={tagName:'DETAILS',open:false},hidden={...control,parentElement:details}
 dialogValidationMessage({checkValidity:()=>false,querySelector:()=>hidden});assert.equal(details.open,true)
 assert.equal(dialogValidationMessage({checkValidity:()=>true,querySelector:()=>assert.fail('valid form must submit')}),'')
 assert.match(dialogValidationMessage({checkValidity:()=>false,querySelector:()=>null}),/Check this value before saving/)
})
test('editing only a statement closing date reaches persistence once and preserves money and assignments',async()=>{
 const source=await readFile(new URL('../src/ReliabilityCenter.jsx',import.meta.url),'utf8'),line=source.split('\n').find(l=>l.startsWith('  const submit='))
 const now=new Date(2026,9,22,12),data=prepareData({accounts:[{id:'card',name:'Card',type:'credit',balance:900,minimum:30,nextDueDate:'2026-11-20'}],cardStatements:[{id:'nov',cardId:'card',dueDate:'2026-11-20',minimum:30,needsReview:false}],transactions:[],payments:[],bills:[],extra:0},now)
 const form={...data.cardStatements[0],closingDate:'2026-10-25',issuerConfirmed:true},calls=[]
 const handler=Function('data','form','mode','saveStatement','update','forgetSavedDraft','setMode','setError',`${line};return submit`)(data,form,'statement',(d,f)=>saveStatement(d,f,now),value=>{calls.push(value);return true},()=>{},value=>calls.push(value),error=>assert.fail(error))
 handler({preventDefault(){}});assert.equal(calls[0].cardStatements[0].closingDate,'2026-10-25');assert.equal(calls[0].accounts[0].balance,900);assert.deepEqual(calls[0].payments,[]);assert.equal(calls[1],'')
 let error='',closed=false,written=false
 const rejected=Function('data','form','mode','saveStatement','update','forgetSavedDraft','setMode','setError',`${line};return submit`)(data,{...form,closingDate:'2026-11-25'},'statement',(d,f)=>saveStatement(d,f,now),()=>{written=true},()=>{},()=>{closed=true},message=>{error=message})
 rejected({preventDefault(){}});assert.match(error,/before its payment due date/);assert.equal(closed,false);assert.equal(written,false)
})
test('statement errors are rendered in the fixed action footer, not only the scrolling body',async()=>{
 const initialForm={id:'nov',cardId:'card',dueDate:'2026-11-20',closingDate:'2026-10-25',minimum:30}
 const server=await createServer({server:{middlewareMode:true},appType:'custom',plugins:[{name:'optional-statement-test',enforce:'pre',transform(code,id){if(id.endsWith('/src/ReliabilityCenter.jsx'))return code.replace("[mode,setMode]=useState('')","[mode,setMode]=useState('statement')").replace('[form,setForm]=useState({})',`[form,setForm]=useState(${JSON.stringify(initialForm)})`)}}]})
 try{
  const {AccessibleDialog}=await server.ssrLoadModule('/src/ReliabilityCenter.jsx')
  const html=renderToStaticMarkup(React.createElement(AccessibleDialog,{title:'Record card statement',error:'Closing date must be before the due date.',onClose(){}},React.createElement('form',{onSubmit(){}},React.createElement('input',{type:'date',defaultValue:'2026-10-25'}),React.createElement('button',{type:'submit'},'Save'))))
  assert.equal((html.match(/<form/g)||[]).length,1);assert.equal((html.match(/type="submit"/g)||[]).length,1)
  assert.match(html,/<footer[^>]*>[\s\S]*role="alert">Not saved: Closing date must be before the due date/)
  assert.match(html,/noValidate=""/i)
  const {default:ReliabilityCenter}=await server.ssrLoadModule('/src/ReliabilityCenter.jsx')
  const data=prepareData({accounts:[{id:'card',name:'Card',type:'credit',balance:900}],cardStatements:[initialForm],transactions:[],payments:[],bills:[],extra:0},new Date(2026,9,22,12))
  const editor=renderToStaticMarkup(React.createElement(ReliabilityCenter,{data,page:'debts',update(){}})),optional=editor.match(/<details class="statement-optional-details">([\s\S]*?)<\/details>/)?.[1]
  assert.ok(optional,'optional details are collapsed by default');assert.match(optional,/Optional statement details/);assert.match(optional,/value="2026-10-25"/);assert.match(optional,/Clear optional closing date/);assert.doesNotMatch(optional,/required=""/);assert.doesNotMatch(editor,/Closing date not recorded/)
 }finally{await server.close()}
})
