import { AccessibleDialog } from './ReliabilityCenter.jsx'
export default function ConfirmAction({request,onClose}){
  return <AccessibleDialog title={request.title} onClose={onClose}><p>{request.message}</p><button type="button" className="primary" onClick={()=>{request.run();onClose()}}>{request.label||'Confirm'}</button></AccessibleDialog>
}
