import { Cloud } from 'lucide-react'
import { Children,isValidElement } from 'react'
import { RELEASE_VERSION } from './release.js'
export default function CloudScreen({children}){
 const parts=Children.toArray(children),paragraph=parts.findIndex(child=>isValidElement(child)&&child.type==='p'),position=paragraph>=0?paragraph+1:parts.length
 return <main className="cloud-screen"><section className="cloud-card"><div className="cloud-mark"><Cloud size={24}/></div>{parts.slice(0,position)}<p className="cloud-release">Debt Free v{RELEASE_VERSION}</p>{parts.slice(position)}</section></main>
}
