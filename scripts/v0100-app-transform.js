function replace(code,before,after){if(!code.includes(before))throw new Error(`v0.10.0 missing ${before.slice(0,100)}`);return code.replace(before,after)}
function line(code,prefix,after){const found=code.split('\n').find(value=>value.startsWith(prefix));if(!found)throw new Error(`v0.10.0 missing line ${prefix}`);return code.replace(found,after)}

export function transformAppV0100(source){
  let code=`import IncomeForecast from './IncomeForecast.jsx'
import { nextOccurrenceForSchedule } from './lib/incomeForecast.js'
${source}`
  code=replace(code,"const VERSION='0.9.9'","const VERSION='0.10.0'")
  code=line(code,' const openIncome=',` const openIncome=t=>{setForm(t?{...t,date:transactionDay(t)}:{date:dateValue(),historical:false,accountId:checking[0]?.id||cashAccounts[0]?.id||'',incomeScheduleId:'',scheduledIncomeDate:''});setModal('income')}
 const linkIncomeSchedule=id=>{const schedule=(data.incomeSchedules||[]).find(item=>item.id===id),occurrence=schedule?nextOccurrenceForSchedule(schedule,data.transactions):null;setForm(previous=>schedule&&occurrence?{...previous,incomeScheduleId:schedule.id,scheduledIncomeDate:occurrence.date,merchant:schedule.name,amount:schedule.amount,accountId:schedule.accountId}:{...previous,incomeScheduleId:'',scheduledIncomeDate:''})}`)
  code=replace(code,"<small>{safeToSpend<0?'Your unpaid obligations exceed available cash':'Cash minus tracked cash bills and statement minimums'}</small></div></section><section className=\"stats four\">","<small>{safeToSpend<0?'Your unpaid obligations exceed available cash':'Cash minus tracked cash bills and statement minimums'}</small></div></section><IncomeForecast data={data} update={update}/><section className=\"stats four\">")
  code=replace(code,"{(modal==='purchase'||modal==='income')&&<><Field label=\"Date\">","{(modal==='purchase'||modal==='income')&&<>{modal==='income'&&<><Field label=\"Expected income schedule\"><select value={form.incomeScheduleId||''} onChange={e=>linkIncomeSchedule(e.target.value)}><option value=\"\">Not linked to an expected deposit</option>{(data.incomeSchedules||[]).filter(item=>item.active!==false||item.id===form.incomeScheduleId).map(item=><option key={item.id} value={item.id}>{item.name} — {money2.format(item.amount)}</option>)}</select></Field>{form.incomeScheduleId&&form.scheduledIncomeDate&&<p className=\"modal-note income-link-note\">This real deposit will replace the {dateLabel(form.scheduledIncomeDate)} forecast so it is not counted twice. You can adjust the actual amount or deposit date.</p>}</>}<Field label=\"Date\">")
  return code
}
