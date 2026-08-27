export function transformAppV093(source) {
  const line=source.split('\n').find(l=>l.includes("page==='transactions'&&<PageHead"))
  const start=line?.indexOf('<div className="table-list">')??-1
  const rowStart=line?.indexOf('<ActionRow',start)??-1
  const rowEnd=line?.indexOf('/>)}</div>',rowStart)??-1
  if(start<0||rowStart<0||rowEnd<0||!source.includes("const VERSION='0.9.2'"))throw new Error('v0.9.3 Activity or version anchor missing')
  const row=line.slice(rowStart,rowEnd+2)
  const replacement=line.slice(0,start)+`<ActivityList data={data} renderTransaction={t=>${row}} onStatements={()=>setPage('debts')} onBills={()=>setPage('bills')} onAccounts={()=>setPage('accounts')}/>`+line.slice(rowEnd+'/>)}</div>'.length)
  return "import ActivityList from './ActivityList.jsx'\n"+source.replace(line,replacement.replace('Income, expenses and external transfers stay separate so spending totals remain accurate.','Review recorded activity across your accounts, including payments and recurring charges.')).replace("const VERSION='0.9.2'","const VERSION='0.9.3'")
}
