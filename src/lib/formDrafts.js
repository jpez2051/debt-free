// A dirty editor must never be silently replaced by a remote workspace refresh.
const editors=new Set()
export const setDirtyForm=(id,dirty)=>{if(dirty)editors.add(id);else editors.delete(id)}
export const hasDirtyForms=()=>editors.size>0
