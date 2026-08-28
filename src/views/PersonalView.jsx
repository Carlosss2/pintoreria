import { useMemo } from 'react'
import { Clock4, DoorClosed, DoorOpen, TimerOff } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { dayKey, dayKeyOf, fmtDate, fmtTime, isLateCheckIn, minutesOfDay, ROLE_LABEL } from '../lib/utils'
import { Badge, EmptyState, Pill } from '../components/ui'

export default function PersonalView() {
  const { users, clockEvents, clock, currentUser } = useApp()
  const today = dayKey()

  const rows = useMemo(() => {
    return users.map(u => {
      const evts = clockEvents.filter(e => e.userId === u.id && dayKeyOf(e.ts) === today)
      const ins = evts.filter(e => e.type === 'in').map(e => e.ts).sort()
      const outs = evts.filter(e => e.type === 'out').map(e => e.ts).sort()
      const firstIn = ins[0] || null
      const lastOut = outs[outs.length - 1] || null
      let hours = null
      if (firstIn && lastOut) hours = (new Date(lastOut) - new Date(firstIn)) / 3600000
      const dentro = firstIn && !lastOut
      const estado = !firstIn ? 'fuera' : dentro ? (isLateCheckIn(firstIn) ? 'tarde' : 'dentro') : 'completo'
      return { user: u, firstIn, lastOut, hours, estado }
    })
  }, [users, clockEvents, today])

  const recent = useMemo(
    () => [...clockEvents].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 12),
    [clockEvents]
  )

  const isManager = currentUser.role !== 'vendedor'

  return (
    <div className="view">
      <div className="alert alert-info">
        <Clock4 size={18} />
        Reloj checador · límite de puntualidad 09:05. {isManager ? 'Como supervisión puedes registrar checadas de todo el equipo.' : 'Solo puedes registrar tus propias checadas.'}
      </div>

      <div className="card">
        <div className="card-title"><DoorOpen size={16} /> Equipo · hoy</div>
        <table className="tbl">
          <thead>
            <tr><th>Colaborador</th><th>Rol</th><th>Estado</th><th>Entrada</th><th>Salida</th><th>Horas</th><th className="ta-r">Checar</th></tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const canOperate = isManager || r.user.id === currentUser.id
              return (
                <tr key={r.user.id}>
                  <td>
                    <span className="cell-name"><b>{r.user.name}</b>{r.user.id === currentUser.id && <Pill tone="acc">tú</Pill>}</span>
                  </td>
                  <td><Badge role={r.user.role} /></td>
                  <td>
                    {r.estado === 'dentro' && <Pill tone="ok">Dentro</Pill>}
                    {r.estado === 'tarde' && <Pill tone="warn">Dentro (llegó tarde)</Pill>}
                    {r.estado === 'fuera' && <Pill tone="mut">Sin registro</Pill>}
                    {r.estado === 'completo' && <Pill tone="pri">Turno completo</Pill>}
                  </td>
                  <td>
                    {r.firstIn ? fmtTime(r.firstIn) : '—'}{' '}
                    {r.firstIn && isLateCheckIn(r.firstIn) && <Pill tone="err">Tardanza {minutesOfDay(r.firstIn) - 545} min</Pill>}
                  </td>
                  <td>{r.lastOut ? fmtTime(r.lastOut) : '—'}</td>
                  <td>{r.hours != null ? `${Math.floor(r.hours)}h ${Math.round((r.hours % 1) * 60)}m` : '—'}</td>
                  <td className="ta-r">
                    {!canOperate ? (
                      <button className="btn btn-ghost btn-sm" disabled title="Requiere rol Supervisor o Dirección">
                        <TimerOff size={13} /> Bloqueado
                      </button>
                    ) : r.firstIn && !r.lastOut ? (
                      <button className="btn btn-warn btn-sm" onClick={() => clock(r.user.id, 'out')}>
                        <DoorClosed size={14} /> Salida
                      </button>
                    ) : (
                      <button className="btn btn-ok btn-sm" onClick={() => clock(r.user.id, 'in')}>
                        <DoorOpen size={14} /> Entrada
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-title"><Clock4 size={16} /> Últimos registros</div>
        {recent.length === 0 ? (
          <EmptyState icon="⏱" title="Sin checadas registradas" />
        ) : (
          <ul className="feed">
            {recent.map(e => {
              const u = users.find(x => x.id === e.userId)
              const regBy = users.find(x => x.id === e.registeredBy)
              const other = regBy && regBy.id !== e.userId
              return (
                <li key={e.id}>
                  <span className={`feed-icon t-${e.type === 'in' ? 'ok' : 'mut'}`}>
                    {e.type === 'in' ? <DoorOpen size={15} /> : <DoorClosed size={15} />}
                  </span>
                  <div className="feed-body">
                    <span>
                      <b>{u?.name}</b> · {e.type === 'in' ? 'Entrada' : 'Salida'}
                      {e.type === 'in' && isLateCheckIn(e.ts) && <Pill tone="err">Tardanza</Pill>}
                    </span>
                    <small>
                      {fmtDate(e.ts)} · {fmtTime(e.ts)}
                      {other ? ` · Registró: ${regBy.name}` : ''}
                    </small>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="hint-line">
        Toda checada queda vinculada al usuario activo ({ROLE_LABEL[currentUser.role]}: {currentUser.name}) para trazabilidad.
      </p>
    </div>
  )
}
