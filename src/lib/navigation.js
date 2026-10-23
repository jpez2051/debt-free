let state={page:'dashboard',ready:false}
const listeners=new Set()
export const navigationSnapshot=()=>state
export const navigationGroupForPage=page=>['accounts','transactions','bills'].includes(page)?'money':['debts','payoff'].includes(page)?'plan':page==='spending'?'spending':page==='insights'?'more':'home'
export function publishNavigation(page,ready=true){if(state.page===page&&state.ready===ready)return;state={page,ready};for(const listener of listeners)listener()}
export function subscribeNavigation(listener){listeners.add(listener);return()=>listeners.delete(listener)}
export function requestNavigation(page){window.dispatchEvent(new CustomEvent('debt-free-navigate',{detail:page}))}
