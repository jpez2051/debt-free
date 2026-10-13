import { useEffect, useRef } from 'react'
import { setDirtyForm } from './lib/formDrafts.js'
export default function useDirtyForm(dirty){const id=useRef(Symbol('inline-editor'));useEffect(()=>{setDirtyForm(id.current,dirty);return()=>setDirtyForm(id.current,false)},[dirty])}
