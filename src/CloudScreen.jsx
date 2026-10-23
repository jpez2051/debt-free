import { Cloud } from 'lucide-react'
import { RELEASE_VERSION } from './release.js'
export default function CloudScreen({children}){return <main className="cloud-screen"><section className="cloud-card"><div className="cloud-mark"><Cloud size={24}/></div><p className="release-badge">Debt Free v{RELEASE_VERSION}</p>{children}</section></main>}
