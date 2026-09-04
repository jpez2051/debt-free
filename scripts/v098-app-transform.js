export function transformAppV098(source){
  const heading='<PageHead title="Insights" text="Cash flow context makes recommendations more useful than generic budgeting advice.">'
  if(!source.includes(heading)||!source.includes('<DataHealth data={data}/>')||!source.includes("const VERSION='0.9.7'"))throw new Error('v0.9.8 Insights/version anchors missing')
  let code=source.replace(heading,`${heading}<div className="sub-actions insight-health-jump"><button className="secondary" type="button" aria-controls="data-health" onClick={()=>document.getElementById('data-health')?.scrollIntoView({behavior:'smooth',block:'start'})}>View Data Health</button></div>`)
  code=code.replace('<DataHealth data={data}/>','<DataHealth data={data} update={update}/>')
  return code.replace("const VERSION='0.9.7'","const VERSION='0.9.8'")
}
