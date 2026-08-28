import { useMemo, useState } from 'react'
import { Package, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { FINISHES, money, PRESENTATIONS } from '../lib/utils'
import { ColorDot, EmptyState, Field, Modal, Pill } from '../components/ui'

const EMPTY = {
  marca: '', linea: '', color: '', hex: '#8a8f98', acabado: 'Mate',
  presentacion: 4, rendimiento: 8, precio: '', stock: ''
}

export default function CatalogoView() {
  const { products, currentUser, saveProduct, deactivateProduct, authorize, notify } = useApp()
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [errors, setErrors] = useState({})

  const isManager = currentUser.role !== 'vendedor'
  const marcas = [...new Set(products.filter(p => p.activo).map(p => p.marca))].sort()

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return products
      .filter(p => p.activo)
      .filter(p =>
        !needle ||
        `${p.marca} ${p.linea} ${p.color} ${p.acabado}`.toLowerCase().includes(needle)
      )
      .sort((a, b) => a.marca.localeCompare(b.marca))
  }, [products, q])

  const openNew = () => {
    setErrors({})
    setForm({ ...EMPTY })
  }

  const openEdit = p => {
    setErrors({})
    setForm({ ...p })
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async e => {
    e.preventDefault()
    const errs = {}
    ;['marca', 'linea', 'color', 'acabado', 'precio'].forEach(k => {
      if (!String(form[k] ?? '').trim()) errs[k] = 'obligatorio'
    })
    if (!form.presentacion) errs.presentacion = 'obligatorio'
    if (!Number(form.rendimiento) || Number(form.rendimiento) <= 0) errs.rendimiento = '> 0'
    if (isNaN(parseFloat(form.precio)) || parseFloat(form.precio) < 0) errs.precio = 'inválido'
    if (isNaN(parseInt(form.stock)) || parseInt(form.stock) < 0) errs.stock = 'inválido'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const data = {
      id: form.id,
      marca: String(form.marca).trim(),
      linea: String(form.linea).trim(),
      color: String(form.color).trim(),
      hex: form.hex || '#8a8f98',
      acabado: form.acabado,
      presentacion: Number(form.presentacion),
      rendimiento: Number(form.rendimiento),
      precio: Math.round(parseFloat(form.precio) * 100) / 100,
      stock: parseInt(form.stock) || 0
    }
    const prev = products.find(p => p.id === data.id) || null

    let approver = null
    if (prev && prev.precio !== data.precio) {
      approver = await authorize(
        'Cambio de precio',
        `${prev.marca} ${prev.linea} · ${prev.color}: ${money(prev.precio)} → ${money(data.precio)}`
      )
      if (!approver) {
        notify('Cambio de precio cancelado: sin autorización', 'warn')
        return
      }
    }
    saveProduct(data, prev, approver)
    setForm(null)
  }

  const doDeactivate = async () => {
    const approver = await authorize('Baja de producto', `${confirmDel.marca} ${confirmDel.linea} · ${confirmDel.color}`)
    if (!approver) {
      notify('Operación cancelada: sin autorización', 'warn')
      setConfirmDel(null)
      return
    }
    deactivateProduct(confirmDel.id, approver)
    setConfirmDel(null)
  }

  return (
    <div className="view">
      <div className="toolbar">
        <div className="search-box slim">
          <Search size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por marca, línea, color o acabado…" />
        </div>
        <span className="toolbar-info">{filtered.length} productos activos</span>
        <button className="btn btn-pri" onClick={openNew} disabled={!isManager}
          title={!isManager ? 'Requiere rol Supervisor o Dirección' : ''}>
          <Plus size={15} /> Nuevo producto
        </button>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr><th>Producto</th><th>Marca</th><th>Línea</th><th>Acabado</th><th>Present.</th><th>Rend.</th><th>Precio</th><th>Stock</th><th className="ta-r">Acciones</th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td><span className="cell-dot-name"><ColorDot hex={p.hex} size={18} /><b>{p.color}</b></span></td>
                <td>{p.marca}</td>
                <td>{p.linea}</td>
                <td><Pill tone="pri">{p.acabado}</Pill></td>
                <td>{p.presentacion} L</td>
                <td>{p.rendimiento} m²/L</td>
                <td><b>{money(p.precio)}</b></td>
                <td>{p.stock <= 5 ? <Pill tone="err">{p.stock} u.</Pill> : <Pill tone="ok">{p.stock} u.</Pill>}</td>
                <td className="ta-r row-actions">
                  <button className="icon-btn" onClick={() => openEdit(p)} disabled={!isManager}
                    title={!isManager ? 'Requiere rol Supervisor o Dirección' : 'Editar'}>
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn danger" onClick={() => setConfirmDel(p)} disabled={!isManager}
                    title={!isManager ? 'Requiere rol Supervisor o Dirección' : 'Dar de baja'}>
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={<Package />} title="Sin productos" hint="Ajusta la búsqueda." />}
      </div>

      <p className="hint-line">
        <ShieldCheck size={13} /> Crear y editar requiere rol Supervisor/Dirección. Todo cambio de precio exige PIN y queda registrado con autor y autorizador.
      </p>

      {form && (
        <Modal title={form.id ? `Editar · ${form.linea} ${form.color}` : 'Nuevo producto'} icon={Package}
          onClose={() => setForm(null)}>
          <form onSubmit={submit} className="form-grid two">
            <Field label="Marca *" error={errors.marca}>
              <input list="marcas" value={form.marca} onChange={e => setField('marca', e.target.value)} placeholder="Comex, Berel…" />
              <datalist id="marcas">{marcas.map(m => <option key={m} value={m} />)}</datalist>
            </Field>
            <Field label="Línea *" error={errors.linea}>
              <input value={form.linea} onChange={e => setField('linea', e.target.value)} placeholder="Vinimex, Beralto…" />
            </Field>
            <Field label="Color *" error={errors.color}>
              <div className="color-input-row">
                <input type="color" value={form.hex} onChange={e => setField('hex', e.target.value)} />
                <input value={form.color} onChange={e => setField('color', e.target.value)} placeholder="Rojo Óxido…" />
              </div>
            </Field>
            <Field label="Acabado *" error={errors.acabado}>
              <select value={form.acabado} onChange={e => setField('acabado', e.target.value)}>
                {FINISHES.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Presentación (L) *" error={errors.presentacion}>
              <select value={form.presentacion} onChange={e => setField('presentacion', Number(e.target.value))}>
                {PRESENTATIONS.map(pr => <option key={pr} value={pr}>{pr} L</option>)}
              </select>
            </Field>
            <Field label="Rendimiento (m²/L) *" error={errors.rendimiento}>
              <input type="number" min="1" step="0.5" value={form.rendimiento} onChange={e => setField('rendimiento', e.target.value)} />
            </Field>
            <Field label="Precio (MXN) *" error={errors.precio}>
              <input type="number" min="0" step="0.01" value={form.precio} onChange={e => setField('precio', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Stock (unidades) *" error={errors.stock}>
              <input type="number" min="0" step="1" value={form.stock} onChange={e => setField('stock', e.target.value)} placeholder="0" />
            </Field>
            <div className="form-actions span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn btn-pri">{form.id ? 'Guardar cambios' : 'Dar de alta'}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="Dar de baja producto" icon={Trash2} onClose={() => setConfirmDel(null)}>
          <p className="hint-line big-gap">
            Se quitará del catálogo activo: <b>{confirmDel.marca} {confirmDel.linea} · {confirmDel.color} ({confirmDel.presentacion} L)</b>.
            El historial de ventas se conserva. Requiere PIN de supervisor.
          </p>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={doDeactivate}>Solicitar PIN y dar de baja</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
