import { getCloudSession } from './cloudState.js'
// Keep the unfinished fields if protecting the submitted record fails.
export function forgetSavedDraft(update,kind){
 const uid=getCloudSession().user?.uid;Promise.resolve(update.protection).then(()=>{if(getCloudSession().user?.uid===uid)return getCloudSession().actions?.removeDraft?.(kind)}).catch(()=>{})
}
