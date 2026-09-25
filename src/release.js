import packageInfo from '../package.json' with { type: 'json' }

export const RELEASE_VERSION = packageInfo.version
export const STORAGE_KEY = 'debt-free-v040'
export const BACKUP_SCHEMA = 'debt-free-backup-v1'
