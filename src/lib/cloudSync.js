// A stable fingerprint lets two devices detect conflicting whole-workspace saves.
// It deliberately sorts object keys, so equivalent Firestore data has the same value.
export function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

export const cloudFingerprint = data => stableValue(data || {})

export class CloudConflictError extends Error {
  constructor() {
    super('Your records changed on another device before this save. Nothing was overwritten. Reload the newer cloud copy before making another change.')
    this.name = 'CloudConflictError'
    this.code = 'cloud/conflict'
  }
}
