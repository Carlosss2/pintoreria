import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { useApp } from '../state/AppContext'

export default function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.kind === 'warn' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}
