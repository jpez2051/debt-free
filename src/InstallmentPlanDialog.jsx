import { useState } from 'react'
import Modal from './Modal.jsx'
import { saveInstallmentPlan } from './lib/installments.js'

export default function InstallmentPlanDialog({ bill, data, now, update, mode, onClose }) {
  const reverting = mode === 'revert'
  const [form, setForm] = useState({
    balance: mode === 'payoff' ? '0' : '',
    lastDueDate: bill.installmentPlan?.lastDueDate || '',
    confirmPayoff: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const field = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const confirmingZero = form.balance !== '' && Number(form.balance) === 0
  const submit = async () => {
    if (saving) return
    setError('')
    setSaving(true)
    try {
      const next = saveInstallmentPlan(data, bill.id, reverting ? null : form, now)
      const label = reverting ? 'Turned off installment tracking' : confirmingZero ? 'Confirmed installment payoff' : 'Updated installment balance'
      if (update(next, label) === false) throw Error('Could not save. Check the save warning and try again.')
      await update.protection
      onClose()
    } catch (reason) {
      setError(reason.message)
    } finally {
      setSaving(false)
    }
  }
  const title = reverting ? 'Turn off installment tracking' : mode === 'payoff' ? 'Confirm installment payoff' : bill.installmentPlan ? 'Update installment balance' : 'Track an installment plan'
  return <Modal title={title} close={onClose} draft={form} onSubmit={submit} error={error}
    saveLabel={saving ? 'Saving…' : reverting ? 'Turn off tracking' : mode === 'payoff' ? 'Confirm payoff' : 'Save plan'}>
    <div className="bill-record-form">
      {reverting ? <>
        <p><strong>{bill.name}</strong> will follow its regular bill schedule again. Upcoming reminders may return.</p>
        <p>Recorded payments, including extra payments, stay in history. Their effects on account balances are preserved.</p>
      </> : <>
        <p>Use the remaining balance your provider shows today, including payments it has already applied. Record any posted payments you still need to log before setting this balance.</p>
        <label>Provider’s remaining balance<input required type="number" inputMode="decimal" min="0" step=".01" value={form.balance} onChange={event => setForm(current => ({ ...current, balance:event.target.value, confirmPayoff:false }))} /></label>
        {!confirmingZero && <label>Last scheduled due date (optional)<input type="date" value={form.lastDueDate} onChange={event => field('lastDueDate', event.target.value)} onClick={event => { try { event.currentTarget.showPicker?.() } catch {} }} /></label>}
        {!confirmingZero && <p>Enter the last due date from your provider’s schedule to stop estimates beyond the term. Future payments reduce the estimated balance.</p>}
        {confirmingZero && <label className="check-line"><input required type="checkbox" checked={form.confirmPayoff} onChange={event => field('confirmPayoff', event.target.checked)} /> My provider shows this plan is paid off. Stop its bill reminders.</label>}
      </>}
    </div>
  </Modal>
}
