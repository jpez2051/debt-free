import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AccessibleDialog } from './ReliabilityCenter.jsx'
import { localDate } from './lib/finance.js'
import CreditScoreChart from './CreditScoreChart.jsx'

const presets={Aura:{bureau:'Not specified',model:'VantageScore 3.0'},'Credit Karma':{bureau:'Equifax',model:'VantageScore 3.0'},Citi:{bureau:'Not specified',model:'FICO Bankcard Score 8'}}
const fresh=()=>({score:'',date:localDate(),source:'Aura',...presets.Aura})
const labelDate=value=>new Date(`${value}T12:00:00`).toLocaleDateString()
const scoreSeriesKey=entry=>[entry.source,entry.bureau,entry.model].join('\u0000')

export default function CreditScoreTracker({entries,onSave,onRemove}){
  const [entry,setEntry]=useState(null),[error,setError]=useState('')
  const ordered=entries.slice().sort((a,b)=>b.date.localeCompare(a.date))
  const latestBySeries=ordered.reduce((series,item)=>{
    const key=scoreSeriesKey(item)
    if(!series.has(key))series.set(key,item)
    return series
  },new Map())
  const currentScores=[...latestBySeries.values()]
  const priorScore=latest=>ordered.find(item=>scoreSeriesKey(item)===scoreSeriesKey(latest)&&item.date<latest.date)
  const open=value=>{setEntry(value?{...value}:{...fresh()});setError('')}
  const chooseSource=source=>setEntry(current=>({...current,source,...presets[source]}))
  const submit=e=>{e.preventDefault();const score=Number(entry.score),min=entry.model==='FICO Bankcard Score 8'?250:300,max=entry.model==='FICO Bankcard Score 8'?900:850;if(score<min||score>max){setError(`Enter a score from ${min} to ${max}.`);return}const duplicate=entries.some(x=>x.id!==entry.id&&x.date===entry.date&&x.source===entry.source&&x.bureau===entry.bureau&&x.model===entry.model);if(duplicate&&!confirm('A score from this source, bureau and model already exists on this date. Save another entry anyway?'))return;if(onSave({...entry,score})!==false)setEntry(null);else setError('Nothing was saved. Close this window to read the storage warning.')}
  return <><section className="panel content-panel credit-tracker"><div className="credit-tracker-head"><div><span className="kicker">CREDIT HEALTH</span><h2>Current credit scores</h2></div><button className="primary" type="button" onClick={()=>open()}><Plus size={16}/> Add score</button></div><p className="muted credit-note">Scores are grouped by source, bureau and scoring model. Only compare changes within the same group.</p>{entries.length?<><div className="current-score-grid">{currentScores.map(score=>{const previous=priorScore(score),change=previous?Number(score.score)-Number(previous.score):null;return <article className="current-score" key={scoreSeriesKey(score)}><div><strong>{score.score}</strong>{change!==null&&<span className={change>=0?'score-up':'score-down'}>{change>=0?'+':''}{change}</span>}</div><small>{score.source} · {score.bureau} · {score.model}</small><small>Updated {labelDate(score.date)}</small></article>})}</div><CreditScoreChart entries={entries}/><details className="score-history-details"><summary>View score history ({entries.length})</summary><div className="score-history">{ordered.map(x=><div className="score-row" key={x.id}><div><strong>{x.score}</strong></div><small>{x.source} · {x.bureau} · {x.model}</small><small>{labelDate(x.date)}</small><div className="score-actions"><button className="icon-button" type="button" aria-label={`Edit score from ${labelDate(x.date)}`} onClick={()=>open(x)}><Pencil size={14}/></button><button className="icon-button danger" type="button" aria-label={`Remove score from ${labelDate(x.date)}`} onClick={()=>onRemove(x.id)}><Trash2 size={14}/></button></div></div>)}</div></details></>:<div className="empty">Add your first score to begin tracking credit progress.</div>}</section>{entry&&<AccessibleDialog title={entry.id?'Edit credit score':'Add credit score'} onClose={()=>setEntry(null)}><form onSubmit={submit}><label>Score<input autoFocus required type="number" inputMode="numeric" value={entry.score} onChange={e=>setEntry({...entry,score:e.target.value})}/></label><label>Date<input required type="date" value={entry.date} onClick={e=>{try{e.currentTarget.showPicker?.()}catch{}}} onChange={e=>setEntry({...entry,date:e.target.value})}/></label><label>Source<select value={entry.source} onChange={e=>chooseSource(e.target.value)}><option>Aura</option><option>Credit Karma</option><option>Citi</option></select></label><label>Bureau<select value={entry.bureau} onChange={e=>setEntry({...entry,bureau:e.target.value})}><option>Not specified</option><option>Equifax</option><option>Experian</option><option>TransUnion</option></select></label><label>Model<select value={entry.model} onChange={e=>setEntry({...entry,model:e.target.value})}><option>VantageScore 3.0</option><option>FICO Bankcard Score 8</option><option>Other</option></select></label>{error&&<p className="save-error" role="alert">{error}</p>}<button className="primary" type="submit">{entry.id?'Save changes':'Save score'}</button></form></AccessibleDialog>}</>
}
