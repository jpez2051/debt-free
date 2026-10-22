// Submit explicitly so native validation cannot silently suppress React's
// submit handler while the invalid control is outside the visible scroll area.
export function dialogValidationMessage(form){
 if(form.checkValidity())return ''
 const control=form.querySelector(':invalid')
 for(let parent=control?.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true
 control?.focus?.({preventScroll:true})
 control?.scrollIntoView?.({block:'center',behavior:'auto'})
 const label=control?.labels?.[0]?.textContent?.trim()||control?.getAttribute?.('aria-label')||'A field'
 return `${label}: ${control?.validationMessage||'Check this value before saving.'}`
}
