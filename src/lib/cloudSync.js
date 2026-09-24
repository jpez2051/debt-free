// A stable fingerprint lets two devices detect conflicting whole-workspace saves.
// It deliberately sorts object keys, so equivalent Firestore data has the same value.
export function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

// Firestore rejects undefined fields. Omit optional object fields consistently on
// both sides of the conflict check, including records created before this fix.
export function cloudSafeData(value) {
  if(Array.isArray(value))return value.map(item=>{
    if(item===undefined)throw new Error('A cloud record contains an empty list item. Nothing was saved.')
    return cloudSafeData(item)
  })
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined).map(([key,item])=>[key,cloudSafeData(item)]))
  return value
}

export const cloudFingerprint = data => stableValue(cloudSafeData(data || {}))

export class CloudConflictError extends Error {
  constructor() {
    super('Your records changed on another device before this save. Nothing was overwritten. Reload the newer cloud copy before making another change.')
    this.name = 'CloudConflictError'
    this.code = 'cloud/conflict'
  }
}
