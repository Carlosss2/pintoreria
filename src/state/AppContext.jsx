import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { buildSeed } from '../lib/seed'
import { uid } from '../lib/utils'

const KEY = 'pintupanel.v1'
const Ctx = createContext(null)

const load = () => {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* noop */
  }
  return buildSeed()
}

export function AppProvider({ children }) {
  const [state, setState] = useState(load)
  const [toasts, setToasts] = useState([])
  const [pinReq, setPinReq] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* noop */
    }
  }, [state])

  const notify = useCallback((msg, kind = 'ok') => {
    const id = uid()
    setToasts(t => [...t, { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400)
  }, [])

  const authorize = useCallback(
    (title, detail = '') =>
      new Promise(resolve => {
        setPinReq({ title, detail, resolve })
      }),
    []
  )

  const resolvePin = useCallback(result => {
    setPinReq(req => {
      if (req) req.resolve(result)
      return null
    })
  }, [])

  const currentUser = state.users.find(u => u.id === state.currentUserId) || null

  const log = useCallback((action, detail = '') => {
    setState(s => ({
      ...s,
      auditLog: [
        { id: uid(), ts: new Date().toISOString(), userId: s.currentUserId, action, detail },
        ...s.auditLog
      ].slice(0, 400)
    }))
  }, [])

  const login = useCallback(userId => {
    setState(s => ({
      ...s,
      currentUserId: userId,
      auditLog: [
        { id: uid(), ts: new Date().toISOString(), userId, action: 'Inicio de sesión', detail: '' },
        ...s.auditLog
      ]
    }))
  }, [])

  const logout = useCallback(() => {
    setState(s => ({ ...s, currentUserId: null }))
  }, [])

  const resetDemo = useCallback(() => {
    localStorage.removeItem(KEY)
    location.reload()
  }, [])

  const addClient = useCallback(
    data => {
      const client = { id: uid(), notas: '', direccion: '', telefono: '', ...data }
      setState(s => ({ ...s, clients: [client, ...s.clients] }))
      log('Cliente creado', `${data.nombre}`)
      notify(`Cliente "${data.nombre}" registrado`)
      return client
    },
    [log, notify]
  )

  const saveProduct = useCallback(
    (data, prev, approver) => {
      let priceChanged = false
      setState(s => {
        priceChanged = !!prev && prev.precio !== data.precio
        const exists = s.products.some(p => p.id === data.id)
        const products = exists
          ? s.products.map(p => (p.id === data.id ? { ...p, ...data } : p))
          : [{ ...data, id: data.id || uid(), activo: true }, ...s.products]
        return { ...s, products }
      })
      if (!prev) log('Producto creado', `${data.marca} ${data.linea} · ${data.color} · ${data.presentacion}L`)
      else if (priceChanged)
        log('Cambio de precio', `${prev.marca} ${prev.linea} ${prev.color}: $${prev.precio} → $${data.precio} · Autorizó: ${approver ? approver.name : '—'}`)
      else log('Producto actualizado', `${data.marca} ${data.linea} · ${data.color}`)
      notify(prev ? 'Producto actualizado' : 'Producto agregado al catálogo')
    },
    [log, notify]
  )

  const deactivateProduct = useCallback(
    (id, approver) => {
      const p = state.products.find(x => x.id === id)
      setState(s => ({
        ...s,
        products: s.products.map(x => (x.id === id ? { ...x, activo: false } : x))
      }))
      log('Producto desactivado', `${p ? `${p.marca} ${p.linea} ${p.color}` : id} · Autorizó: ${approver.name}`)
      notify('Producto dado de baja del catálogo', 'warn')
    },
    [log, notify, state.products]
  )

  const addSale = useCallback(
    payload => {
      let sale = null
      setState(s => {
        const folio = (s.counters?.folio || 1000) + 1
        const subtotal = Math.round(payload.items.reduce((sum, it) => sum + it.unitPrice * it.units, 0) * 100) / 100
        const discountPct = Number(payload.discountPct) || 0
        sale = {
          id: uid(),
          folio,
          fecha: new Date().toISOString(),
          tipo: 'venta',
          userId: s.currentUserId,
          clientId: payload.clientId || null,
          metodoPago: payload.metodoPago || 'efectivo',
          discountPct,
          discountAuthBy: discountPct > 0 && payload.discountAuthBy ? payload.discountAuthBy : null,
          items: payload.items.map(it => ({ ...it })),
          subtotal,
          total: Math.round(subtotal * (1 - discountPct / 100) * 100) / 100
        }
        return {
          ...s,
          counters: { ...s.counters, folio },
          sales: [sale, ...s.sales],
          products: s.products.map(p => {
            const it = payload.items.find(i => i.productId === p.id)
            return it ? { ...p, stock: Math.max(0, p.stock - it.units) } : p
          })
        }
      })
      const clientName = state.clients.find(c => c.id === payload.clientId)?.nombre
      log(
        `Venta registrada`,
        `Folio V-${sale.folio} · Total $${sale.total.toFixed(2)} · ${payload.metodoPago}${payload.discountPct ? ` · Desc. ${payload.discountPct}% (Autorizó: ${payload.discountAuthBy?.name})` : ''}${clientName ? ` · Cliente: ${clientName}` : ''}`
      )
      return sale
    },
    [log, state.clients]
  )

  const openSession = state.cashSessions.find(cs => !cs.closedAt) || null

  const openCash = useCallback(
    fondo => {
      setState(s => {
        if (s.cashSessions.some(cs => !cs.closedAt)) return s
        const session = {
          id: uid(),
          openedAt: new Date().toISOString(),
          closedAt: null,
          openedBy: s.currentUserId,
          closedBy: null,
          fondo: Number(fondo) || 0,
          retiros: [],
          conteo: null,
          diff: null
        }
        return { ...s, cashSessions: [session, ...s.cashSessions] }
      })
      log('Apertura de caja', `Fondo inicial: $${Number(fondo).toFixed(2)}`)
      notify('Caja abierta para tu turno')
    },
    [log, notify]
  )

  const cashEfectivoOfSession = useCallback(
    session => {
      if (!session) return 0
      const start = new Date(session.openedAt).getTime()
      return state.sales
        .filter(s => s.metodoPago === 'efectivo' && new Date(s.fecha).getTime() >= start)
        .reduce((sum, s) => sum + s.total, 0)
    },
    [state.sales]
  )

  const closeCash = useCallback(
    (conteo, approver) => {
      const session = openSession
      if (!session) return
      const ef = state.sales
        .filter(sl => sl.metodoPago === 'efectivo' && new Date(sl.fecha).getTime() >= new Date(session.openedAt).getTime())
        .reduce((sum, sl) => sum + sl.total, 0)
      const retirado = session.retiros.reduce((sum, r) => sum + r.monto, 0)
      const esperado = session.fondo + ef - retirado
      const diff = Math.round((Number(conteo) - esperado) * 100) / 100
      setState(s => ({
        ...s,
        cashSessions: s.cashSessions.map(cs =>
          cs.id === session.id
            ? { ...cs, closedAt: new Date().toISOString(), closedBy: s.currentUserId, conteo: Number(conteo), diff }
            : cs
        )
      }))
      log(
        'Cierre de caja',
        `Conteo $${Number(conteo).toFixed(2)} · Esperado $${esperado.toFixed(2)} · Diferencia ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)}${approver ? ` · Autorizó: ${approver.name}` : ''}`
      )
      notify('Cierre de caja registrado')
    },
    [log, notify, openSession, state.sales]
  )

  const withdrawCash = useCallback(
    (monto, motivo, approver) => {
      setState(s => {
        const sessions = s.cashSessions.map(cs =>
          !cs.closedAt
            ? {
                ...cs,
                retiros: [
                  ...cs.retiros,
                  { id: uid(), monto: Number(monto), motivo, ts: new Date().toISOString(), solicitadoPor: s.currentUserId, autorizadoPor: approver.id }
                ]
              }
            : cs
        )
        return { ...s, cashSessions: sessions }
      })
      log('Retiro de efectivo', `$${Number(monto).toFixed(2)} · ${motivo} · Autorizó: ${approver.name}`)
      notify('Retiro registrado')
    },
    [log, notify]
  )

  const clock = useCallback(
    (targetUserId, type) => {
      setState(s => ({
        ...s,
        clockEvents: [
          { id: uid(), userId: targetUserId, type, ts: new Date().toISOString(), registeredBy: s.currentUserId },
          ...s.clockEvents
        ]
      }))
      const target = state.users.find(u => u.id === targetUserId)
      const byOther = targetUserId !== state.currentUserId
      log(type === 'in' ? 'Checada de entrada' : 'Checada de salida', `${target?.name || targetUserId}${byOther ? ` · Registró: ${currentUser?.name}` : ''}`)
      notify(`${target?.name}: ${type === 'in' ? 'ENTRADA' : 'SALIDA'} registrada${byOther ? ' por ti' : ''}`)
    },
    [log, notify, state.users, state.currentUserId, currentUser]
  )

  const value = {
    ...state,
    currentUser,
    openSession,
    toasts,
    pinReq,
    login,
    logout,
    resetDemo,
    notify,
    authorize,
    resolvePin,
    log,
    addClient,
    saveProduct,
    deactivateProduct,
    addSale,
    openCash,
    closeCash,
    withdrawCash,
    clock,
    cashEfectivoOfSession
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)
