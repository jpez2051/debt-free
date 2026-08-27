import { validateData } from './backup.js'
import { prepareData } from './finance.js'
import { STORAGE_KEY, BACKUP_SCHEMA } from '../release.js'

export function createRepository(storage, key=STORAGE_KEY) {
  let expected,blocked='',loaded=false
  return {
    load(fallback) {
      try {
        expected=storage.getItem(key);loaded=true
        if(!expected)return prepareData(fallback)
        const data=JSON.parse(expected)
        if(!validateData(data))throw new Error('Stored records need recovery.')
        return prepareData({...fallback,...data})
      } catch {
        blocked='Your saved data could not be opened. It has not been replaced. Download the stored data or restore a verified backup in Settings.'
        return prepareData(fallback)
      }
    },
    get error(){return blocked},
    save(data) {
      if(blocked||!loaded)throw new Error(blocked||'Storage has not been opened.')
      if(!validateData(data))throw new Error('These changes could not be validated. Nothing was saved.')
      const current=storage.getItem(key)
      if(current!==expected)throw new Error('Another tab changed these records. Reload this tab before entering more activity; your other tab’s data has been preserved.')
      const next=JSON.stringify(data)
      try {
        if(current){
          if(!storage.getItem(`${key}-before-v090`))storage.setItem(`${key}-before-v090`,current)
          storage.setItem(`${key}-previous`,current)
        }
        storage.setItem(key,next)
        expected=next
      } catch {throw new Error('Could not save to this browser. Nothing was committed. Free browser storage or download a backup, then try again.')}
    },
  }
}
let repository
export const loadState = fallback => {
  try {repository=createRepository(localStorage);return repository.load(fallback)}
  catch {return {...prepareData(fallback),storageUnavailable:true}}
}
export const storageError = () => repository?.error||(!repository?'Browser storage is unavailable. Changes cannot be saved.':'')
export const persistState = data => {
  if(!repository)throw new Error('Browser storage is unavailable. Nothing was saved.')
  repository.save(data)
  window.dispatchEvent(new Event('debt-free-data-updated'))
}
export function parseBackup(text) {
  const parsed=JSON.parse(text)
  if(parsed.schema&&parsed.schema!==BACKUP_SCHEMA)throw new Error('This backup uses an unsupported format. Keep the file and use a compatible app version.')
  const data=parsed.data||parsed
  if(data.financeVersion!==undefined&&data.financeVersion!==1)throw new Error('This backup was created by an unsupported finance-data version.')
  if(!validateData(data))throw new Error('The backup contains invalid or conflicting records.')
  return prepareData(data)
}
