function replace(code,before,after){if(!code.includes(before))throw new Error(`v0.10.1 missing ${before.slice(0,100)}`);return code.replace(before,after)}
function appendLine(code,prefix,addition){const found=code.split('\n').find(value=>value.startsWith(prefix));if(!found)throw new Error(`v0.10.1 missing line ${prefix}`);return code.replace(found,`${found}\n${addition}`)}

export function transformAppV0101(source){
  let code=replace(source,"const VERSION='0.10.0'","const VERSION='0.10.1'")
  code=appendLine(code,' const linkIncomeSchedule='," const confirmExpectedIncome=occurrence=>{const schedule=(data.incomeSchedules||[]).find(item=>item.id===occurrence.scheduleId);if(!schedule)return;setForm({date:dateValue(),historical:false,accountId:schedule.accountId,merchant:schedule.name,amount:schedule.amount,incomeScheduleId:schedule.id,scheduledIncomeDate:occurrence.date});setModal('income')}")
  code=replace(code,'<IncomeForecast data={data} update={update}/>','<IncomeForecast data={data} update={update} onConfirmIncome={confirmExpectedIncome}/>')
  return code
}
