import { useMemo, useState } from 'react'
import { Palette, Phone, Plus, Search, UserPlus, Users } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { fmtFullDate, money } from '../lib/utils'
import { ColorDot, EmptyState, Field, Modal, Pill, UserChip } from '../components/ui'

const EMPTY = { nombre: '', telefono: '', direccion: '', notas: '' }

export default function ClientesView() {
  const { clients, sales, users, addClient, currentUser } = useApp()
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return clients.filter(c => !needle || `${c.nombre} ${c.telefono} ${c.direccion}`.toLowerCase().includes(needle))
  }, [clients, q])

  const selected = clients.find(c => c.id === selectedId) || filtered[0] || null

  const history = useMemo(() => {
    if (!selected) return []
    return sales
      .filter(s => s.clientId === selected.id && s.tipo === 'venta')
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .flatMap(s =>
        s.items.map(it => ({
          key: s.id + it.productId + it.units,
          fecha: s.fecha,
          folio: s.folio,
          linea: it.nombre,
          color: it.color,
          hex: it.hex,
          acabado: it.acabado,
          liters: it.liters,
          amount: it.unitPrice * it.units,
          seller: users.find(u => u.id === s.userId),
          metodo: s.metodoPago
        }))
      )
  }, [sales, users, selected])

  const stats = useMemo(() => {
    if (!history.length) return null
    const litros = history.reduce((s, h) => s + h.liters, 0)
    const colores = [...new Set(history.map(h => h.color))]
    return {
      compras: new Set(history.map(h => h.folio)).size,
      litros,
      ultima: history[0].fecha,
      colores
    }
  }, [history])

  const submit = e => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setErrors({ nombre: 'obligatorio' })
      return
    }
    const c = addClient({
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      direccion: form.direccion.trim(),
      notas: form.notas.trim()
    })
    setSelectedId(c.id)
    setForm(null)
  }

  return (
    <div className="view">
      <div className="clientes-split">
        <section className="card list-col">
          <div className="search-box slim">
            <Search size={16} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar cliente…" />
          </div>
          <button className="btn btn-pri btn-block" onClick={() => { setForm({ ...EMPTY }); setErrors({}) }}>
            <UserPlus size={15} /> Nuevo cliente
          </button>
          <ul className="client-list">
            {filtered.map(c => (
              <li key={c.id}>
                <button className={`client-item ${selected?.id === c.id ? 'on' : ''}`} onClick={() => setSelectedId(c.id)}>
                  <strong>{c.nombre}</strong>
                  <span>{c.telefono || 'Sin teléfono'}</span>
                </button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && <EmptyState icon={<Users />} title="Sin clientes" />}
        </section>

        <section className="detail-col">
          {!selected ? (
            <div className="card"><EmptyState icon={<Users />} title="Selecciona un cliente" hint="O registra uno nuevo para comenzar su historial." /></div>
          ) : (
            <>
              <div className="card client-head">
                <div>
                  <h2>{selected.nombre}</h2>
                  <p><Phone size={13} /> {selected.telefono || '—'} · {selected.direccion || 'Sin dirección'}</p>
                  {selected.notas && <p className="notes">“{selected.notas}”</p>}
                </div>
              </div>

              {stats ? (
                <>
                  <div className="kpi-grid three">
                    <div className="mini-kpi"><span>Compras</span><b>{stats.compras}</b></div>
                    <div className="mini-kpi"><span>Litros históricos</span><b>{stats.litros} L</b></div>
                    <div className="mini-kpi"><span>Última visita</span><b>{new Date(stats.ultima).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</b></div>
                  </div>

                  <div className="card">
                    <div className="card-title"><Palette size={16} /> Paleta del cliente</div>
                    <div className="palette-row">
                      {stats.colores.map(colorName => {
                        const h = history.find(x => x.color === colorName)
                        return (
                          <span key={colorName} className="palette-chip">
                            <ColorDot hex={h?.hex} /> {colorName}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-title">Historial de proyectos · línea y color exacto</div>
                    <table className="tbl">
                      <thead>
                        <tr><th>Fecha</th><th>Folio</th><th>Línea</th><th>Color</th><th>Acabado</th><th>Litros</th><th>Importe</th><th>Vendió</th></tr>
                      </thead>
                      <tbody>
                        {history.map(h => (
                          <tr key={h.key}>
                            <td>{fmtFullDate(h.fecha).split(',')[0]} {new Date(h.fecha).getDate()}/{new Date(h.fecha).getMonth() + 1}</td>
                            <td className="mono">V-{h.folio}</td>
                            <td>{h.linea}</td>
                            <td><span className="cell-dot-name"><ColorDot hex={h.hex} /><b>{h.color}</b></span></td>
                            <td><Pill tone="pri">{h.acabado}</Pill></td>
                            <td>{h.liters} L</td>
                            <td><b>{money(h.amount)}</b></td>
                            <td><UserChip user={h.seller} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="card">
                  <EmptyState icon="🗂" title="Aún sin historial" hint={`Cuando ${selected.nombre} realice compras aparecerán aquí con la línea y color exactos.`} />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {form && (
        <Modal title="Nuevo cliente" icon={Plus} onClose={() => setForm(null)}>
          <form onSubmit={submit} className="form-grid">
            <Field label="Nombre o razón social *" error={errors.nombre}>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
            </Field>
            <Field label="Teléfono">
              <input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
            </Field>
            <Field label="Dirección">
              <input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
            </Field>
            <Field label="Notas">
              <textarea rows={2} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
            </Field>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" className="btn btn-pri">Guardar cliente</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
