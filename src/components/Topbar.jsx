import { useEffect, useState } from 'react'
import { Badge } from './ui'

const TITLES = {
  pos: 'Punto de Venta',
  caja: 'Control de Caja',
  personal: 'Control de Personal',
  catalogo: 'Catálogo e Inventario',
  clientes: 'Clientes',
  dashboard: 'Dashboard Gerencial'
}

export default function Topbar({ view }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="topbar">
      <h1>{TITLES[view]}</h1>
      <div className="topbar-right">
        <span className="topbar-date">
          {now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
          {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </header>
  )
}

export { TITLES }
export function RoleTag({ user }) {
  if (!user) return null
  return (
    <span className="topbar-user">
      <Badge role={user.role} />
    </span>
  )
}
