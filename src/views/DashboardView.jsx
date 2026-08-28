import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, History, Palette, ShieldAlert, Timer, TrendingUp } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { dayKeyOf, fmtDate, fmtDT, fmtTime, isLateCheckIn, money } from '../lib/utils'
import { EmptyState, Pill, UserChip } from '../components/ui'

const PERIODS = [
  { days: 1, label: 'Hoy' },
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' }
]

export default function DashboardView({ navigate }) {
  const { currentUser, sales, clockEvents, users, auditLog } = useApp()

  useEffect(() => {
    if (currentUser.role === 'vendedor') navigate('pos')
  }, [currentUser, navigate])

  const [days, setDays] = useState(7)

  const periodSales = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (days - 1))
    return sales.filter(s => s.tipo === 'venta' && new Date(s.fecha) >= start)
  }, [sales, days])

  const kpis = useMemo(() => {
    const ingresos = periodSales.reduce((s, v) => s + v.total, 0)
    const litros = periodSales.reduce((s, v) => s + v.items.reduce((x, it) => x + it.liters, 0), 0)
    return { ingresos, litros, ventas: periodSales.length, ticket: periodSales.length ? ingresos / periodSales.length : 0 }
  }, [periodSales])

  const litrosPorDia = useMemo(() => {
    const buckets = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      buckets.push({ key: dayKeyOf(d.toISOString()), label: d.toLocaleDateString('es-MX', { day: '2-digit' }), litros: 0 })
    }
    periodSales.forEach(s =>
      s.items.forEach(it => {
        const k = dayKeyOf(s.fecha)
        const b = buckets.find(x => x.key === k)
        if (b) b.litros += it.liters
      })
    )
    return buckets
  }, [periodSales, days])

  const acabados = useMemo(() => {
    const acc = {}
    periodSales.forEach(s => s.items.forEach(it => {
      if (!acc[it.acabado]) acc[it.acabado] = 0
      acc[it.acabado] += it.liters
    }))
    const arr = Object.entries(acc).map(([name, litros]) => ({ name, litros })).sort((a, b) => b.litros - a.litros)
    const total = arr.reduce((s, a) => s + a.litros, 0) || 1
    return arr.map(a => ({ ...a, share: Math.round((a.litros / total) * 100) }))
  }, [periodSales])

  const lineasTop = useMemo(() => {
    const acc = {}
    periodSales.forEach(s => s.items.forEach(it => {
      const key = it.nombre
      if (!acc[key]) acc[key] = { nombre: key, hex: it.hex, color: it.color, litros: 0, importe: 0 }
      acc[key].litros += it.liters
      acc[key].importe += it.unitPrice * it.units
    }))
    return Object.values(acc).sort((a, b) => b.importe - a.importe).slice(0, 5)
  }, [periodSales])

  const puntualidad = useMemo(() => {
    const start = new Date()
    start.setDate(start.getDate() - 30)
    const ins = clockEvents.filter(e => e.type === 'in' && new Date(e.ts) >= start)
    const late = ins.filter(e => isLateCheckIn(e.ts))
    const pct = ins.length ? Math.round(((ins.length - late.length) / ins.length) * 100) : 100
    const recentLates = [...late]
      .sort((a, b) => new Date(b.ts) - new Date(a.ts))
      .slice(0, 5)
      .map(e => ({ ...e, user: users.find(u => u.id === e.userId) }))
    return { pct, tardanzas: late.length, checadas: ins.length, recentLates }
  }, [clockEvents, users])

  const maxLitros = Math.max(...litrosPorDia.map(b => b.litros), 1)

  if (currentUser.role === 'vendedor') return null

  return (
    <div className="view">
      <div className="toolbar">
        <span className="toolbar-info big">Vista exclusiva de gerencia · datos del equipo</span>
        <div className="seg">
          {PERIODS.map(p => (
            <button key={p.days} className={days === p.days ? 'on' : ''} onClick={() => setDays(p.days)}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <KPI icon={TrendingUp} tone="ok" label={`Ingresos · ${PERIODS.find(p => p.days === days).label}`} value={money(kpis.ingresos)} />
        <KPI icon={Palette} tone="pri" label={`Litros vendidos · ${PERIODS.find(p => p.days === days).label}`} value={`${kpis.litros} L`} />
        <KPI icon={BarChart3} tone="acc" label="Tickets" value={kpis.ventas} />
        <KPI icon={TrendingUp} tone="gold" label="Ticket promedio" value={money(kpis.ticket)} />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><BarChart3 size={16} /> Litros vendidos por día</div>
          <div className="bar-chart">
            {litrosPorDia.map(b => (
              <div key={b.key} className="bar-col" title={`${b.key}: ${b.litros} L`}>
                <span className="bar-val">{b.litros > 0 ? b.litros : ''}</span>
                <div className="bar" style={{ height: `${Math.max(4, (b.litros / maxLitros) * 120)}px` }} />
                <span className="bar-label">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card center">
          <div className="card-title"><Timer size={16} /> Puntualidad del equipo · 30 días</div>
          <div className="ring" style={{ background: `conic-gradient(var(--ok) ${puntualidad.pct * 3.6}deg, #262a35 0)` }}>
            <div className="ring-inner">
              <b>{puntualidad.pct}%</b>
              <span>puntuales</span>
            </div>
          </div>
          <p className="hint-line">{puntualidad.checadas} entradas registradas · <b className="neg">{puntualidad.tardanzas} tardanzas</b></p>
          {puntualidad.recentLates.length > 0 && (
            <ul className="late-list">
              {puntualidad.recentLates.map(e => (
                <li key={e.id}>
                  <UserChip user={e.user} />
                  <Pill tone="err">{fmtTime(e.ts)}</Pill>
                  <small>{fmtDate(e.ts)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><Palette size={16} /> Acabado más vendido</div>
          {acabados.length === 0 ? (
            <EmptyState icon={<Palette />} title="Sin ventas en el periodo" />
          ) : (
            <>
              <div className="winner">
                <span>🏆</span>
                <div>
                  <b>{acabados[0].name}</b>
                  <small>{acabados[0].litros} L vendidos · {acabados[0].share}% del volumen</small>
                </div>
              </div>
              <ul className="share-list">
                {acabados.map(a => (
                  <li key={a.name}>
                    <span>{a.name}</span>
                    <div className="share-track"><div style={{ width: `${a.share}%` }} /></div>
                    <b>{a.litros} L</b>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title"><TrendingUp size={16} /> Líneas top por importe</div>
          {lineasTop.length === 0 ? (
            <EmptyState icon={<TrendingUp />} title="Sin datos en el periodo" />
          ) : (
            <table className="tbl">
              <thead><tr><th>Línea</th><th>Color estrella</th><th>Litros</th><th>Importe</th></tr></thead>
              <tbody>
                {lineasTop.map(l => (
                  <tr key={l.nombre}>
                    <td><b>{l.nombre}</b></td>
                    <td><span className="cell-dot-name"><span className="color-dot" style={{ background: l.hex }} />{l.color}</span></td>
                    <td>{l.litros} L</td>
                    <td><b>{money(l.importe)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title"><History size={16} /> Auditoría reciente · trazabilidad por usuario</div>
        {auditLog.length === 0 ? (
          <EmptyState icon={<ShieldAlert />} title="Sin actividad registrada en esta sesión" />
        ) : (
          <ul className="feed audit">
            {auditLog.slice(0, 9).map(a => {
              const u = users.find(x => x.id === a.userId)
              return (
                <li key={a.id}>
                  <span className={`feed-icon t-${/Cambio de precio|Retiro|desactivado|diferencia/i.test(a.action + a.detail) ? 'warn' : 'ok'}`}>
                    {/Venta|Apertura|Producto|Cliente|Checada/.test(a.action) ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
                  </span>
                  <div className="feed-body">
                    <span><b>{a.action}</b>{a.detail ? ` · ${a.detail}` : ''}</span>
                    <small>{fmtDT(a.ts)}</small>
                  </div>
                  <UserChip user={u} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function KPI({ icon: Icon, tone, label, value }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon t-${tone}`}><Icon size={20} /></div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </div>
  )
}
