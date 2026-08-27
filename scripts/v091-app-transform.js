export function transformAppV091(source) {
  const start=source.indexOf('<Panel title="Upcoming obligations"'),end=source.indexOf('</Panel>',start)
  if(start<0||end<0||!source.includes("const VERSION='0.9.0'"))throw new Error('v0.9.1: upcoming obligations or version anchor missing')
  const code=source.slice(0,start)+'<UpcomingSummary data={data} onStatements={()=>setPage(\'debts\')}/>'+source.slice(end+'</Panel>'.length)
  return "import UpcomingSummary from './UpcomingSummary.jsx'\n"+code.replace("const VERSION='0.9.0'","const VERSION='0.9.1'")
}
