import { X } from 'lucide-react'
import { ROLE_LABEL, initials } from '../lib/utils'

export function Modal({ title, icon: Icon, onClose, children, wide }) {
  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <div className="modal-title">
            {Icon && <Icon size={18} />}
            <h3>{title}</h3>
          </div>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Badge({ role }) {
  return <span className={`badge role-${role}`}>{ROLE_LABEL[role] || role}</span>
}

export function UserChip({ user, label }) {
  if (!user) return null
  return (
    <span className="chip-user" title={`${user.name} · ${ROLE_LABEL[user.role]}`}>
      <span className="avatar sm">{initials(user.name)}</span>
      {label ? `${label}: ` : ''}
      {user.name}
    </span>
  )
}

export function Pill({ tone = 'mut', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'pri' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon t-${tone}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  )
}

export function Field({ label, error, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label} {error && <em className="field-error">{error}</em>}
      </span>
      {children}
    </label>
  )
}

export function EmptyState({ icon: Icon = '📦', title, hint }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{typeof Icon === 'string' ? Icon : <Icon size={28} />}</div>
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
    </div>
  )
}

export function ColorDot({ hex, size = 14 }) {
  return <span className="color-dot" style={{ background: hex || '#888', width: size, height: size }} />
}
