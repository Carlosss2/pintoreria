import { Palette } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { ROLE_LABEL, initials } from '../lib/utils'
import { Badge } from './ui'

export default function Login() {
  const { users, login } = useApp()
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand big">
          <div className="brand-logo">
            <Palette size={26} />
          </div>
          <div>
            <strong>PintuPanel</strong>
            <span>Sistema administrativo · Pinturería del Valle</span>
          </div>
        </div>
        <p className="login-sub">Selecciona tu usuario para iniciar el turno. Toda tu actividad quedará registrada a tu nombre.</p>
        <div className="login-grid">
          {users.map(u => (
            <button key={u.id} className="login-user" onClick={() => login(u.id)}>
              <span className={`avatar lg role-ring-${u.role}`}>{initials(u.name)}</span>
              <strong>{u.name}</strong>
              <Badge role={u.role} />
              <code>PIN {u.pin}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
