import { useEffect, useRef, useState } from 'react'
import { Delete, ShieldCheck } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { ROLE_LABEL } from '../lib/utils'

export default function PinModal() {
  const { pinReq, resolvePin, users } = useApp()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (pinReq) {
      setCode('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [pinReq])

  if (!pinReq) return null

  const managers = users.filter(u => u.role === 'supervisor' || u.role === 'dueno')

  const verify = value => {
    if (value.length !== 4) return
    const approver = managers.find(u => u.pin === value)
    if (approver) resolvePin({ id: approver.id, name: approver.name, role: approver.role })
    else {
      setError('PIN incorrecto. Intenta de nuevo.')
      setShake(true)
      setCode('')
      setTimeout(() => setShake(false), 450)
    }
  }

  const onChange = v => {
    const clean = v.replace(/\D/g, '').slice(0, 4)
    setCode(clean)
    setError('')
    if (clean.length === 4) setTimeout(() => verify(clean), 120)
  }

  return (
    <div className="modal-overlay">
      <div className={`modal pin-modal ${shake ? 'shake' : ''}`}>
        <div className="pin-head">
          <div className="pin-shield">
            <ShieldCheck size={22} />
          </div>
          <h3>Autorización requerida</h3>
          <p className="pin-title">{pinReq.title}</p>
          {pinReq.detail && <p className="pin-detail">{pinReq.detail}</p>}
        </div>

        <input
          ref={inputRef}
          className="pin-input"
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={e => onChange(e.target.value)}
          aria-label="PIN de supervisor"
        />
        <div className="pin-dots">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={code.length > i ? 'on' : ''} />
          ))}
        </div>
        {error && <p className="pin-error">{error}</p>}
        <p className="pin-hint">Ingresa el PIN de un supervisor o dirección</p>

        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} className="key" onClick={() => onChange(code + n)}>
              {n}
            </button>
          ))}
          <span />
          <button className="key" onClick={() => onChange(code + '0')}>0</button>
          <button className="key" onClick={() => onChange(code.slice(0, -1))}>
            <Delete size={16} />
          </button>
        </div>

        <div className="pin-managers">
          Autorizan: {managers.map(m => `${m.name} (${ROLE_LABEL[m.role]})`).join(' · ')}
        </div>

        <button className="btn btn-ghost btn-block" onClick={() => resolvePin(null)}>
          Cancelar operación
        </button>
      </div>
    </div>
  )
}
