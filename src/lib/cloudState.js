let activeData = null
let cloudSession = { status:'loading', user:null, sync:'', actions:{} }

const announce = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('debt-free-cloud-updated'))
}

export const setActiveData = data => { activeData = data; announce() }
export const getActiveData = () => activeData
export const setCloudSession = session => { cloudSession = { ...cloudSession, ...session }; announce() }
export const getCloudSession = () => cloudSession
