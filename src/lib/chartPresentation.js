const colors={'Food & Drink':'#66e6b8','Transportation':'#78a9ff','Shopping & Personal':'#ffb86b','Bills & Utilities':'#d89cff','Subscriptions':'#ff7d91','Entertainment':'#67d5e8','Housing':'#b9a1ff','Health':'#f2b06f','Insurance':'#8caee6','Travel':'#b7d96b','Debt Costs':'#e495b0','Education':'#7bd0b5','Other':'#9aa9b8'}
export const categoryColor=category=>colors[category]||colors.Other
export function creditScorePoints(values,min,max){
 const times=values.map(v=>Date.parse(`${v.date.slice(0,10)}T12:00:00Z`)),first=Math.min(...times),last=Math.max(...times),span=last-first
 return values.map((entry,i)=>({entry,x:span?6+(times[i]-first)/span*88:50,y:88-(Number(entry.score)-min)/(max-min)*76}))
}
