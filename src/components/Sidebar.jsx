import { BarChart3, Clock4, Package, Palette, RotateCcw, ShoppingCart, Users, Wallet } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { ROLE_LABEL, initials } from '../lib/utils'

const NAV = [
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
  { id: 'caja', label: 'Control de Caja', icon: Wallet },
  { id: 'personal', label: 'Control de Personal', icon: Clock4 },
  { id: 'catalogo', label: 'Catálogo e Inventario', icon: Package },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'dashboard', label: 'Panel Gerencial', icon: BarChart3, roles: ['supervisor', 'dueno'] }
]

export default function Sidebar({ view, setView }) {
  const { currentUser, logout, resetDemo } = useApp()
  const items = NAV.filter(n => !n.roles || n.roles.includes(currentUser.role))

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <Palette size={20} />
        </div>
        <div>
          <strong>PintuPanel</strong>
          <span>Pinturería del Valle</span>
        </div>
      </div>

      <nav className="side-nav">
        {items.map(n => (
          <button
            key={n.id}
            className={`nav-item ${view === n.id ? 'active' : ''}`}
            onClick={() => setView(n.id)}
          >
            <n.icon size={18} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="user-card">
          <span className="avatar">{initials(currentUser.name)}</span>
          <div className="user-meta">
            <strong>{currentUser.name}</strong>
            <span>{ROLE_LABEL[currentUser.role]}</span>
          </div>
        </div>
        <div className="foot-actions">
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            Cambiar usuario
          </button>
          <button className="btn btn-ghost btn-sm" onClick={resetDemo} title="Restaura datos de demostración">
            <RotateCcw size={14} /> Demo
          </button>
        </div>
      </div>
    </aside>
  )
}
