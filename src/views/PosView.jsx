import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CreditCard,
  Landmark,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
  X
} from 'lucide-react'
import { useApp } from '../state/AppContext'
import { money, PAY_LABEL } from '../lib/utils'
import { ColorDot, EmptyState, Field, Modal, UserChip } from '../components/ui'

const MAX_FREE_DISCOUNT = { vendedor: 0, supervisor: 15, dueno: 100 }

export default function PosView({ navigate }) {
  const { products, clients, currentUser, openSession, addSale, authorize, notify } = useApp()
  const [q, setQ] = useState('')
  const [fMarca, setFMarca] = useState('')
  const [fLinea, setFLinea] = useState('')
  const [fAcabado, setFAcabado] = useState('')
  const [fPres, setFPres] = useState('')
  const [cart, setCart] = useState([])
  const [calcId, setCalcId] = useState('')
  const [area, setArea] = useState('')
  const [manos, setManos] = useState(2)
  const [desp, setDesp] = useState(10)
  const [discPct, setDiscPct] = useState('')
  const [discAuth, setDiscAuth] = useState(null)
  const [metodo, setMetodo] = useState('efectivo')
  const [clientId, setClientId] = useState('')
  const [ticket, setTicket] = useState(null)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const authLock = useRef(false)

  const active = products.filter(p => p.activo)
  const opts = key => [...new Set(active.map(p => p[key]))].sort()

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return active.filter(p => {
      const hay = `${p.marca} ${p.linea} ${p.color} ${p.acabado} ${p.presentacion}l`.toLowerCase()
      return (
        (!needle || hay.includes(needle)) &&
        (!fMarca || p.marca === fMarca) &&
        (!fLinea || p.linea === fLinea) &&
        (!fAcabado || p.acabado === fAcabado) &&
        (!fPres || String(p.presentacion) === fPres)
      )
    })
  }, [active, q, fMarca, fLinea, fAcabado, fPres])

  const calcProduct = active.find(p => p.id === calcId)

  const calc = useMemo(() => {
    if (!calcProduct) return null
    const a = parseFloat(area) || 0
    const m = Math.max(1, parseInt(manos) || 1)
    const d = Math.min(50, Math.max(0, parseFloat(desp) || 0))
    const litros = a > 0 ? (a * m * (1 + d / 100)) / calcProduct.rendimiento : 0
    const units = Math.ceil(litros / calcProduct.presentacion)
    return { litros, units, total: units * calcProduct.precio }
  }, [calcProduct, area, manos, desp])

  const addToCart = (product, units) => {
    if (!product || units < 1) return
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id)
      const currentUnits = existing?.units || 0
      const finalUnits = Math.min(currentUnits + units, product.stock)
      if (finalUnits <= currentUnits) {
        notify(`Stock insuficiente para ${product.linea} ${product.color}`, 'warn')
        return prev
      }
      if (existing) return prev.map(i => (i.productId === product.id ? { ...i, units: finalUnits } : i))
      return [...prev, { productId: product.id, units: finalUnits }]
    })
  }

  const setUnits = (pid, units) =>
    setCart(prev => {
      const p = products.find(x => x.id === pid)
      const clamped = Math.max(0, Math.min(units, p?.stock || 0))
      return clamped === 0 ? prev.filter(i => i.productId !== pid) : prev.map(i => (i.productId === pid ? { ...i, units: clamped } : i))
    })

  const cartRows = cart.map(i => {
    const p = products.find(x => x.id === i.productId)
    return { ...i, p }
  }).filter(r => r.p)

  const subtotal = cartRows.reduce((s, r) => s + r.p.precio * r.units, 0)
  const pct = Number(discPct) || 0
  const total = Math.round(subtotal * (1 - pct / 100) * 100) / 100

  const commitDiscount = async value => {
    const v = Number(value) || 0
    const maxFree = MAX_FREE_DISCOUNT[currentUser.role]
    if (v <= maxFree) {
      setDiscPct(value)
      setDiscAuth(null)
      return
    }
    if (authLock.current) return
    authLock.current = true
    const approver = await authorize(
      'Descuento especial',
      `${currentUser.name} solicita ${v}% de descuento (excede su límite de ${maxFree}%)`
    )
    authLock.current = false
    if (approver) {
      setDiscPct(value)
      setDiscAuth(approver)
      notify(`Descuento autorizado por ${approver.name}`)
    } else {
      setDiscPct('')
      setDiscAuth(null)
      notify('Descuento cancelado: sin autorización', 'warn')
    }
  }

  const checkout = async () => {
    if (!cartRows.length) return
    if (!openSession) {
      notify('Abre la caja antes de vender', 'warn')
      return
    }
    const maxFree = MAX_FREE_DISCOUNT[currentUser.role]
    let auth = discAuth
    if (pct > maxFree && !auth) {
      const approver = await authorize('Descuento especial', `${pct}% sobre ${money(subtotal)}`)
      if (!approver) {
        notify('Descuento cancelado: sin autorización', 'warn')
        return
      }
      auth = approver
      setDiscAuth(approver)
    }
    const items = cartRows.map(r => ({
      productId: r.p.id,
      nombre: `${r.p.marca} ${r.p.linea}`,
      color: r.p.color,
      hex: r.p.hex,
      acabado: r.p.acabado,
      presentacion: r.p.presentacion,
      unitPrice: r.p.precio,
      units: r.units,
      liters: r.units * r.p.presentacion
    }))
    const sale = addSale({ items, discountPct: pct, discountAuthBy: pct > 0 ? auth : null, metodoPago: metodo, clientId: clientId || null })
    setTicket(sale)
    setCart([])
    setDiscPct('')
    setDiscAuth(null)
    setClientId('')
    setArea('')
    notify(`Venta V-${sale.folio} registrada a nombre de ${currentUser.name}`)
  }

  const clearFilters = () => {
    setQ(''); setFMarca(''); setFLinea(''); setFAcabado(''); setFPres('')
  }

  const ticketClient = clients.find(c => c.id === ticket?.clientId)
  const ticketSeller = useSeller(ticket?.userId)
  const ticketAuth = useSeller(ticket?.discountAuthBy)

  return (
    <div className="view">
      {!openSession && (
        <div className="alert alert-warn">
          <AlertTriangle size={18} />
          No hay una caja abierta para registrar ventas.
          <button className="btn btn-sm btn-pri" onClick={() => navigate('caja')}>Ir a Control de Caja</button>
        </div>
      )}

      <div className="pos-split">
        <section className="card pos-left">
          <div className="search-box">
            <Search size={17} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder='Búsqueda natural: "vinimex rojo mate 4 litros"'
            />
            {(q || fMarca || fLinea || fAcabado || fPres) && (
              <button className="icon-btn" onClick={clearFilters} title="Limpiar filtros"><X size={15} /></button>
            )}
          </div>
          <div className="filter-row">
            <select value={fMarca} onChange={e => setFMarca(e.target.value)}>
              <option value="">Marca</option>
              {opts('marca').map(m => <option key={m}>{m}</option>)}
            </select>
            <select value={fLinea} onChange={e => setFLinea(e.target.value)}>
              <option value="">Línea</option>
              {opts('linea').map(l => <option key={l}>{l}</option>)}
            </select>
            <select value={fAcabado} onChange={e => setFAcabado(e.target.value)}>
              <option value="">Acabado</option>
              {opts('acabado').map(a => <option key={a}>{a}</option>)}
            </select>
            <select value={fPres} onChange={e => setFPres(e.target.value)}>
              <option value="">Presentación</option>
              {[...new Set(active.map(p => p.presentacion))].sort((a, b) => a - b).map(pr => (
                <option key={pr} value={pr}>{pr} L</option>
              ))}
            </select>
          </div>

          <div className="results">
            {filtered.length === 0 && <EmptyState title="Sin resultados" hint="Ajusta la búsqueda o los filtros." />}
            {filtered.map(p => (
              <div
                key={p.id}
                className={`result-row ${calcId === p.id ? 'selected' : ''}`}
                onClick={() => setCalcId(p.id)}
              >
                <ColorDot hex={p.hex} size={22} />
                <div className="result-info">
                  <strong>{p.linea} · {p.color}</strong>
                  <span>{p.marca} · {p.acabado} · {p.rendimiento} m²/L</span>
                </div>
                <div className="result-meta">
                  <strong>{money(p.precio)}</strong>
                  <span>{p.presentacion} L · stock {p.stock}</span>
                </div>
                <button
                  className="icon-btn add-btn"
                  onClick={e => { e.stopPropagation(); addToCart(p, 1) }}
                  disabled={p.stock === 0}
                  title="Agregar al carrito"
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="pos-right">
          <div className="card calc-card">
            <div className="card-title"><Calculator size={17} /> Calculadora de Pintura</div>
            <div className="calc-grid">
              <Field label="Producto">
                <select value={calcId} onChange={e => setCalcId(e.target.value)}>
                  <option value="">Selecciona un producto…</option>
                  {active.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.linea} {p.color} ({p.presentacion}L)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Superficie (m²)">
                <input type="number" min="0" step="0.5" value={area} onChange={e => setArea(e.target.value)} placeholder="Ej. 42" />
              </Field>
              <Field label="Manos">
                <input type="number" min="1" max="4" value={manos} onChange={e => setManos(e.target.value)} />
              </Field>
              <Field label="Desperdicio %">
                <input type="number" min="0" max="50" value={desp} onChange={e => setDesp(e.target.value)} />
              </Field>
            </div>
            {calcProduct && calc && (
              <div className="calc-result">
                <div className="calc-line">
                  <span>Rendimiento base</span>
                  <strong>{calcProduct.rendimiento} m²/L por mano</strong>
                </div>
                <div className="calc-line hl">
                  <span>Litros necesarios</span>
                  <strong>{calc.litros.toFixed(2)} L</strong>
                </div>
                <div className="calc-line">
                  <span>Sugerencia comercial</span>
                  <strong>{calc.units > 0 ? `${calc.units} cubeta(s) de ${calcProduct.presentacion} L` : '—'}</strong>
                </div>
                <div className="calc-line">
                  <span>Costo estimado</span>
                  <strong>{money(calc.total)}</strong>
                </div>
                <button
                  className="btn btn-pri btn-block"
                  onClick={() => addToCart(calcProduct, calc.units)}
                  disabled={!calc.units || calcProduct.stock === 0}
                >
                  <Plus size={15} /> Agregar {calc.units || 0} × {calcProduct.presentacion} L a la venta
                </button>
              </div>
            )}
          </div>

          <div className="card cart-card">
            <div className="card-title">
              <ShoppingCart size={17} /> Venta actual
              <span className="spacer" />
              <UserChip user={currentUser} label="Opera" />
            </div>

            <div className="cart-items">
              {cartRows.length === 0 && <EmptyState icon="🛒" title="Carrito vacío" hint="Agrega productos desde el buscador o la calculadora." />}
              {cartRows.map(r => (
                <div key={r.p.id} className="cart-row">
                  <ColorDot hex={r.p.hex} />
                  <div className="cart-info">
                    <strong>{r.p.linea} · {r.p.color}</strong>
                    <span>{r.p.marca} · {r.p.presentacion} L</span>
                  </div>
                  <div className="qty">
                    <button className="icon-btn" onClick={() => setUnits(r.p.id, r.units - 1)}><Minus size={13} /></button>
                    <b>{r.units}</b>
                    <button className="icon-btn" onClick={() => setUnits(r.p.id, r.units + 1)}><Plus size={13} /></button>
                  </div>
                  <strong className="cart-price">{money(r.p.precio * r.units)}</strong>
                  <button className="icon-btn danger" onClick={() => setUnits(r.p.id, 0)}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>

            <div className="pay-grid">
              <Field label="Cliente (opcional)">
                <select value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">Venta de mostrador</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
              <Field label={`Descuento %${currentUser.role === 'vendedor' ? ' (requiere PIN)' : ''}`}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discPct}
                  onBlur={e => commitDiscount(e.target.value)}
                  onChange={e => setDiscPct(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitDiscount(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
            {discAuth && <div className="auth-note">Descuento autorizado por <UserChip user={discAuth} /></div>}

            <div className="method-row">
              {['efectivo', 'tarjeta', 'transferencia'].map(m => (
                <button key={m} className={`method ${metodo === m ? 'on' : ''}`} onClick={() => setMetodo(m)}>
                  {m === 'efectivo' ? <Banknote size={16} /> : m === 'tarjeta' ? <CreditCard size={16} /> : <Landmark size={16} />}
                  {PAY_LABEL[m]}
                </button>
              ))}
            </div>

            <div className="totals">
              <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
              {pct > 0 && <div className="disc-line"><span>Descuento {pct}%</span><b>−{money(subtotal - total)}</b></div>}
              <div className="grand"><span>Total</span><b>{money(total)}</b></div>
            </div>

            <div className="checkout-actions">
              <button className="btn btn-ghost" onClick={() => cartRows.length && setQuoteOpen(true)} disabled={!cartRows.length}>
                <Receipt size={15} /> Cotización
              </button>
              <button className="btn btn-pri grow" onClick={checkout} disabled={!cartRows.length || !openSession}>
                <Wallet size={16} /> Cobrar {money(total)}
              </button>
            </div>
          </div>
        </section>
      </div>

      {quoteOpen && (
        <Modal title="Cotización" icon={Receipt} onClose={() => setQuoteOpen(false)} wide>
          <DocPreview
            kind="COTIZACIÓN"
            rows={cartRows.map(r => ({
              label: `${r.p.marca} ${r.p.linea} · ${r.p.color} (${r.p.presentacion} L)`,
              hex: r.p.hex,
              units: r.units,
              amount: r.p.precio * r.units
            }))}
            subtotal={subtotal}
            pct={pct}
            total={total}
            seller={currentUser}
            client={clients.find(c => c.id === clientId)}
            valid="Precios válidos por 48 horas."
          />
          <button className="btn btn-pri btn-block" onClick={() => setQuoteOpen(false)}>Cerrar y continuar en caja</button>
        </Modal>
      )}

      {ticket && (
        <Modal title="Venta completada" icon={Receipt} onClose={() => setTicket(null)} wide>
          <DocPreview
            kind={`VENTA · FOLIO V-${ticket.folio}`}
            rows={ticket.items.map(it => ({
              label: `${it.nombre} · ${it.color} (${it.presentacion} L)`,
              hex: it.hex,
              units: it.units,
              amount: it.unitPrice * it.units
            }))}
            subtotal={ticket.subtotal}
            pct={ticket.discountPct}
            total={ticket.total}
            seller={{ name: ticketSeller?.name || '—' }}
            auth={ticketAuth}
            client={ticketClient}
            metodo={ticket.metodoPago}
            valid=""
          />
          <button className="btn btn-pri btn-block" onClick={() => setTicket(null)}>Nueva venta</button>
        </Modal>
      )}
    </div>
  )
}

function useSeller(userId) {
  const { users } = useApp()
  return users.find(u => u.id === userId) || null
}

function DocPreview({ kind, rows, subtotal, pct, total, seller, auth, client, metodo, valid }) {
  return (
    <div className="doc-preview">
      <div className="doc-head">
        <strong>Pinturería del Valle</strong>
        <span>{kind}</span>
        <span>{new Date().toLocaleString('es-MX')}</span>
      </div>
      <table className="tbl mini">
        <thead>
          <tr><th>Producto</th><th>Cant.</th><th>Importe</th></tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td><span className="cell-dot-name"><ColorDot hex={r.hex} /> {r.label}</span></td>
              <td>{r.units}</td>
              <td>{money(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-totals">
        <div><span>Subtotal</span><b>{money(subtotal)}</b></div>
        {pct > 0 && <div><span>Descuento {pct}%</span><b>−{money(subtotal - total)}</b></div>}
        <div className="grand"><span>Total</span><b>{money(total)}</b></div>
      </div>
      {client && <p className="doc-line">Cliente: {client.nombre}</p>}
      {metodo && <p className="doc-line">Forma de pago: {PAY_LABEL[metodo]}</p>}
      <div className="doc-chips">
        <UserChip user={seller} label="Atendió" />
        {auth && <UserChip user={auth} label="Autorizó desc." />}
      </div>
      {valid && <p className="doc-valid">{valid}</p>}
    </div>
  )
}
