import { REPORTING_PERIODS } from './lib/reporting.js'
import { localDate } from './lib/finance.js'
export default function PeriodPicker({value,onChange}){
 const calendar=typeof value==='string'&&/^\d{4}-\d{2}$/.test(value)
 return <section className="period-picker" aria-label="Reporting period"><span>Reporting period</span><div>{REPORTING_PERIODS.map(period=><button type="button" key={period.id} className={value===period.id?'active':''} aria-pressed={value===period.id} onClick={()=>onChange(period.id)}>{period.label}</button>)}</div><label>Calendar month<input aria-label="Calendar month" type="month" max={localDate().slice(0,7)} value={calendar?value:''} onChange={e=>{if(e.target.value)onChange(e.target.value)}}/></label></section>
}
