export function transformAppV094(source){
  const line=source.split('\n').find(l=>l.includes("page==='accounts'&&<PageHead")),start=line?.indexOf('{data.accounts.map(')??-1,end=line?.lastIndexOf('</PageHead>')??-1
  if(start<0||end<0||!source.includes("const VERSION='0.9.3'"))throw new Error('v0.9.4 accounts/version anchor missing')
  const replacement=line.slice(0,start)+"<AccountTiles accounts={data.accounts} onEdit={openAccountEdit} onRemove={removeAccount}/>"+line.slice(end)
  let code=source.replace(line,replacement)
  code=code.replace("name:form.name.trim(),type:","name:form.name.trim(),accent:form.accent||old?.accent||'#66e6b8',type:")
  code=code.replace('<Field label="Type"><select','<Field label="Tile color"><input type="color" value={form.accent||\'#66e6b8\'} onChange={e=>setForm({...form,accent:e.target.value})}/></Field><Field label="Type"><select')
  return "import AccountTiles from './AccountTiles.jsx'\n"+code.replace("const VERSION='0.9.3'","const VERSION='0.9.4'")
}
