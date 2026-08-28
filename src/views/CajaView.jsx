import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  Banknote,
  CreditCard,
  Landmark,
  LockKeyhole,
  LogIn,
  Receipt,
  Wallet
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { dayKey, dayKeyOf, fmtTime, money, PAY_LABEL } from '../lib/utils'
import { EmptyState, Field, Modal, Pill, StatCard, UserChip } from '../components/ui'

function esperadoOfSession(session, sales) {
  const start = new Date(session.openedAt).getTime()
  const end = session.closedAt ? new Date(session.closedAt).getTime() : Infinity
  const ef = sales
    .filter(s => s.metodoPago === 'efectivo')
    .filter(s => {
      const t = new Date(s.fecha).getTime()
      return t >= start && t <= end
    })
    .reduce((sum, s) => sum + s.total, 0)
  return session.fondo + ef - session.retiros.reduce((sum, r) => sum + r.monto, 0)
}

export default function CajaView() {
  const {
    sales, cashSessions, users, clients, openSession,
    openCash, closeCash, withdrawCash, authorize, notify, currentUser, cashEfectivoOfSession
  } = useApp()

  const [fondoInput, setFondoInput] = useState('')
  const [conteo, setConteo] = useState('')
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [wMonto, setWMonto] = useState('')
  const [wMotivo, setWMotivo] = useState('')

  const today = dayKey()
  const todaysSales = useMemo(
    () => sales.filter(s => s.tipo === 'venta' && dayKeyOf(s.fecha) === today),
    [sales, today]
  )

  const byMethod = useMemo(() => {
    const acc = { efectivo: { total: 0, n: 0 }, tarjeta: { total: 0, n: 0 }, transferencia: { total: 0, n: 0 } }
    todaysSales.forEach(s => {
      if (acc[s.metodoPago]) {
        acc[s.metodoPago].total += s.total
        acc[s.metodoPago].n += 1
      }
    })
    return acc
  }, [todaysSales])

  const dayTotal = todaysSales.reduce((s, v) => s + v.total, 0)
  const retirosSum = openSession ? openSession.retiros.reduce((s, r) => s + r.monto, 0) : 0
  const efectivoSesion = openSession ? cashEfectivoOfSession(openSession) : 0
  const esperado = openSession ? openSession.fondo + efectivoSesion - retirosSum : 0

  const lastClosedToday = useMemo(() => {
    return cashSessions
      .filter(cs => cs.closedAt && dayKeyOf(cs.closedAt) === today)
      .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))[0] || null
  }, [cashSessions, today])

  const doCloseCash = async () => {
    const value = parseFloat(conteo)
    if (isNaN(value)) {
      notify('Captura el conteo físico de efectivo', 'warn')
      return
    }
    const diff = Math.round((value - esperado) * 100) / 100
    let approver = null
    if (Math.abs(diff) > 0.009) {
      approver = await authorize(
        'Cierre de caja con diferencia',
        `Esperado ${money(esperado)} · Conteo ${money(value)} · Diferencia ${diff > 0 ? '+' : ''}${money(diff)}`
      )
      if (!approver) {
        notify('Cierre cancelado: requiere autorización', 'warn')
        return
      }
    }
    closeCash(value, approver)
    setConteo('')
  }

  const doWithdraw = async e => {
    e.preventDefault()
    const monto = parseFloat(wMonto)
    if (!monto || monto <= 0 || !wMotivo.trim()) {
      notify('Completa monto y motivo del retiro', 'warn')
      return
    }
    if (monto > esperado) {
      notify('El retiro excede el efectivo disponible en caja', 'warn')
      return
    }
    const approver = await authorize('Retiro de efectivo', `${money(monto)} · ${wMotivo.trim()}`)
    if (!approver) {
      notify('Retiro cancelado: sin autorización', 'warn')
      return
    }
    withdrawCash(monto, wMotivo.trim(), approver)
    setWithdrawOpen(false)
    setWMonto('')
    setWMotivo('')
  }

  const movements = useMemo(() => {
    const list = []
    cashSessions.forEach(cs => {
      if (dayKeyOf(cs.openedAt) !== today) return
      list.push({ key: 'ap' + cs.id, ts: cs.openedAt, icon: LogIn, label: 'Apertura de caja', amount: cs.fondo, userIds: [cs.openedBy], tone: 'ok', isSale: false })
      cs.retiros.forEach(r =>
        dayKeyOf(r.ts) === today &&
        list.push({ key: r.id, ts: r.ts, icon: ArrowDownToLine, label: `Retiro · ${r.motivo}`, amount: -r.monto, userIds: [r.solicitadoPor, r.autorizadoPor], tone: 'warn', isSale: false })
      )
      if (cs.closedAt && dayKeyOf(cs.closedAt) === today)
        list.push({
          key: 'ci' + cs.id,
          ts: cs.closedAt,
          icon: LockKeyhole,
          label: `Cierre de caja${cs.diff ? ` (dif. ${cs.diff > 0 ? '+' : ''}${money(cs.diff)})` : ''}`,
          amount: cs.conteo ?? 0,
          userIds: [cs.closedBy],
          tone: cs.diff ? 'err' : 'mut',
          isSale: false
        })
    })
    todaysSales.forEach(s =>
      list.push({ key: s.id, ts: s.fecha, icon: Receipt, label: `Venta V-${s.folio} · ${PAY_LABEL[s.metodoPago]}${s.discountPct ? ` · desc. ${s.discountPct}%` : ''}`, amount: s.total, userIds: [s.userId], tone: 'pri', isSale: true })
    )
    return list.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 14)
  }, [cashSessions, todaysSales, today])

  return (
    <div className="view">
      {!openSession && (
        <div className="alert alert-info">
          <LockKeyhole size={18} />
          No hay ninguna caja abierta en este momento.
        </div>
      )}

      {lastClosedToday && Math.abs(lastClosedToday.diff || 0) > 0.009 && (
        <div className={`alert ${lastClosedToday.diff < 0 ? 'alert-error' : 'alert-warn'}`}>
          <AlertTriangle size={18} />
          El último cierre no cuadró: {lastClosedToday.diff < 0 ? 'faltaron' : 'sobraron'}{' '}
          <b>{money(Math.abs(lastClosedToday.diff))}</b> (esperado {money(esperadoOfSession(lastClosedToday, sales))}, contado{' '}
          {money(lastClosedToday.conteo)}) · cerró{' '}
          <UserChip user={users.find(u => u.id === lastClosedToday.closedBy)} />
        </div>
      )}

      {openSession ? (
        <div className="card session-card">
          <div className="session-head">
            <div>
              <div className="card-title"><Wallet size={17} /> Turno abierto</div>
              <p className="session-sub">
                Abrió <UserChip user={users.find(u => u.id === openSession.openedBy)} /> a las {fmtTime(openSession.openedAt)}
              </p>
            </div>
            <Pill tone="ok">CAJA ABIERTA</Pill>
          </div>

          <div className="session-grid">
            <div className="kv"><span>Fondo inicial</span><b>{money(openSession.fondo)}</b></div>
            <div className="kv"><span>Ventas en efectivo</span><b className="pos">{money(efectivoSesion)}</b></div>
            <div className="kv"><span>Retiros</span><b className="neg">−{money(retirosSum)}</b></div>
            <div className="kv hl"><span>Efectivo esperado en caja</span><b>{money(esperado)}</b></div>
          </div>

          <div className="close-panel">
            <Field label="Conteo físico de efectivo al cierre">
              <input type="number" min="0" step="0.01" placeholder="0.00" value={conteo} onChange={e => setConteo(e.target.value)} />
            </Field>
            {conteo !== '' && !isNaN(parseFloat(conteo)) &&
              (() => {
                const diff = Math.round((parseFloat(conteo) - esperado) * 100) / 100
                return (
                  <div className={`diff-preview ${diff === 0 ? 'ok' : diff < 0 ? 'neg' : 'over'}`}>
                    {diff === 0 ? '✓ La caja cuadra' : diff < 0 ? `Faltan ${money(Math.abs(diff))}` : `Sobran ${money(diff)}`}
                  </div>
                )
              })()}
            <div className="close-actions">
              <button className="btn btn-pri" onClick={doCloseCash}>
                <LockKeyhole size={15} /> Cerrar turno
              </button>
              <button className="btn btn-ghost" onClick={() => setWithdrawOpen(true)}>
                <ArrowDownToLine size={15} /> Retiro de efectivo
              </button>
            </div>
          </div>
          <p className="hint-line">Un cierre con diferencia exige PIN de supervisor y queda registrado en la auditoría.</p>
        </div>
      ) : (
        <div className="card session-card">
          <div className="card-title"><LogIn size={17} /> Apertura de caja</div>
          <p className="session-sub">
            Registra el fondo inicial para comenzar el turno. Quedará a nombre de <UserChip user={currentUser} />.
          </p>
          <div className="open-row">
            <Field label="Fondo inicial">
              <input type="number" min="0" step="50" placeholder="Ej. 1500" value={fondoInput} onChange={e => setFondoInput(e.target.value)} />
            </Field>
            <button
              className="btn btn-pri"
              onClick={() => {
                const f = parseFloat(fondoInput)
                if (isNaN(f) || f < 0) {
                  notify('Captura un fondo inicial válido', 'warn')
                  return
                }
                openCash(f)
                setFondoInput('')
              }}
            >
              Abrir caja
            </button>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <StatCard icon={Banknote} label="Efectivo (hoy)" value={money(byMethod.efectivo.total)} hint={`${byMethod.efectivo.n} ventas`} tone="ok" />
        <StatCard icon={CreditCard} label="Tarjeta (hoy)" value={money(byMethod.tarjeta.total)} hint={`${byMethod.tarjeta.n} ventas`} tone="pri" />
        <StatCard icon={Landmark} label="Transferencia (hoy)" value={money(byMethod.transferencia.total)} hint={`${byMethod.transferencia.n} ventas`} tone="acc" />
        <StatCard icon={Wallet} label="Total del día" value={money(dayTotal)} hint={`${todaysSales.length} tickets`} tone="gold" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title"><Receipt size={16} /> Ventas del día</div>
          {todaysSales.length === 0 ? (
            <EmptyState icon="🧾" title="Aún no hay ventas hoy" />
          ) : (
            <table className="tbl">
              <thead>
                <tr><th>Folio</th><th>Hora</th><th>Método</th><th>Cliente</th><th>Total</th><th>Vendió</th></tr>
              </thead>
              <tbody>
                {todaysSales.map(s => (
                  <tr key={s.id}>
                    <td className="mono">V-{s.folio}</td>
                    <td>{fmtTime(s.fecha)}</td>
                    <td><Pill tone={s.metodoPago === 'efectivo' ? 'ok' : s.metodoPago === 'tarjeta' ? 'pri' : 'acc'}>{PAY_LABEL[s.metodoPago]}</Pill></td>
                    <td>{clients.find(c => c.id === s.clientId)?.nombre || '—'}</td>
                    <td><b>{money(s.total)}</b></td>
                    <td><UserChip user={users.find(u => u.id === s.userId)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-title"><ArrowDownToLine size={16} /> Movimientos de caja (hoy)</div>
          {movements.length === 0 ? (
            <EmptyState icon="📭" title="Sin movimientos registrados" />
          ) : (
            <ul className="feed">
              {movements.map(m => (
                <li key={m.key}>
                  <span className={`feed-icon t-${m.tone}`}><m.icon size={15} /></span>
                  <div className="feed-body">
                    <span>{m.label}</span>
                    <small>
                      {fmtTime(m.ts)} ·{' '}
                      {[...new Set(m.userIds.filter(Boolean))]
                        .map(id => users.find(u => u.id === id)?.name.split(' ')[0])
                        .filter(Boolean)
                        .join(' / ')}
                    </small>
                  </div>
                  <b className={m.isSale || m.amount >= 0 ? 'pos' : 'neg'}>
                    {m.amount < 0 ? `−${money(Math.abs(m.amount))}` : money(m.amount)}
                  </b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {withdrawOpen && (
        <Modal title="Retiro de efectivo" icon={ArrowDownToLine} onClose={() => setWithdrawOpen(false)}>
          <form onSubmit={doWithdraw} className="form-grid">
            <Field label="Monto a retirar">
              <input type="number" min="1" step="0.5" value={wMonto} onChange={e => setWMonto(e.target.value)} autoFocus />
            </Field>
            <Field label="Motivo">
              <input value={wMotivo} onChange={e => setWMotivo(e.target.value)} placeholder="Depósito bancario, compra urgente…" />
            </Field>
            <div className="kv"><span>Efectivo disponible</span><b>{money(esperado)}</b></div>
            <p className="hint-line">
              Operación sensible: se solicitará PIN de supervisor y quedará registrada a nombre de <UserChip user={currentUser} />.
            </p>
            <button type="submit" className="btn btn-pri btn-block">Registrar retiro</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
