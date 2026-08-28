import { uid } from './utils'

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildSeed() {
  const users = [
    { id: 'u1', name: 'Carlos Ramírez', role: 'vendedor', pin: '1111' },
    { id: 'u2', name: 'Ana Torres', role: 'supervisor', pin: '2222' },
    { id: 'u3', name: 'Luis Fernández', role: 'vendedor', pin: '3333' },
    { id: 'u4', name: 'Marta Ruiz', role: 'dueno', pin: '9999' },
    { id: 'u5', name: 'Diego Sandoval', role: 'vendedor', pin: '4444' }
  ]

  const products = [
    { id: 'p1', marca: 'Comex', linea: 'Vinimex', color: 'Blanco Pureza', hex: '#f2efe6', acabado: 'Mate', presentacion: 19, rendimiento: 7, precio: 1899, stock: 14, activo: true },
    { id: 'p2', marca: 'Comex', linea: 'Vinimex', color: 'Rojo Óxido', hex: '#b7410e', acabado: 'Mate', presentacion: 4, rendimiento: 7, precio: 520, stock: 22, activo: true },
    { id: 'p3', marca: 'Comex', linea: 'Ultra Hide', color: 'Blanco Estelar', hex: '#f7f5ef', acabado: 'Satín', presentacion: 19, rendimiento: 9, precio: 2650, stock: 8, activo: true },
    { id: 'p4', marca: 'Berel', linea: 'Beralto', color: 'Azul Cobalto', hex: '#0047ab', acabado: 'Satín', presentacion: 4, rendimiento: 8, precio: 610, stock: 18, activo: true },
    { id: 'p5', marca: 'Berel', linea: 'Fester', color: 'Blanco Uso Rudo', hex: '#eeeae0', acabado: 'Semibrillante', presentacion: 1, rendimiento: 9, precio: 145, stock: 40, activo: true },
    { id: 'p6', marca: 'Berel', linea: 'Colonial', color: 'Crema Marfil', hex: '#e8dcc0', acabado: 'Mate', presentacion: 19, rendimiento: 6.5, precio: 1750, stock: 9, activo: true },
    { id: 'p7', marca: 'Pintuco', linea: 'Pintukolor', color: 'Verde Salvia', hex: '#9caf88', acabado: 'Mate', presentacion: 4, rendimiento: 7.5, precio: 585, stock: 16, activo: true },
    { id: 'p8', marca: 'Pintuco', linea: 'Deco', color: 'Gris Urbano', hex: '#6e6a75', acabado: 'Satín', presentacion: 1, rendimiento: 8, precio: 168, stock: 35, activo: true },
    { id: 'p9', marca: 'Comex', linea: 'Primex', color: 'Sellador Blanco', hex: '#dcd6c8', acabado: 'Mate', presentacion: 4, rendimiento: 10, precio: 430, stock: 20, activo: true },
    { id: 'p10', marca: 'Berel', linea: 'Aquaclear', color: 'Transparente Brillante', hex: '#cfe8ea', acabado: 'Brillante', presentacion: 1, rendimiento: 12, precio: 190, stock: 25, activo: true },
    { id: 'p11', marca: 'Pintuco', linea: 'Deco', color: 'Negro Ónix', hex: '#17161a', acabado: 'Semibrillante', presentacion: 1, rendimiento: 8.5, precio: 172, stock: 28, activo: true },
    { id: 'p12', marca: 'Comex', linea: 'Perfection', color: 'Beige Arena', hex: '#d9c7a7', acabado: 'Satín', presentacion: 4, rendimiento: 8.5, precio: 640, stock: 12, activo: true }
  ]

  const clients = [
    { id: 'c1', nombre: 'Constructora Delta', telefono: '81-1234-5678', direccion: 'Av. Industrial 450, Monterrey', notas: 'Cuenta frecuente. Factura mensual.' },
    { id: 'c2', nombre: 'María Solís', telefono: '81-8765-4321', direccion: 'Priv. Las Flores 12', notas: 'Prefiere tonos cálidos.' },
    { id: 'c3', nombre: 'Hotel Boutique Aura', telefono: '81-5555-1010', direccion: 'Zona Centro, Morelia 88', notas: 'Mantenimiento trimestral de fachada.' },
    { id: 'c4', nombre: 'Javier Prado', telefono: '81-2468-1357', direccion: 'Cd. Granja 234, Depto 5B', notas: '' },
    { id: 'c5', nombre: 'Obra Casa Lomas', telefono: '81-9090-8080', direccion: 'Lomas de Chapultepec 77', notas: 'Entregas en obra, pedir cita con residente.' }
  ]

  const rand = mulberry32(20260823)
  const sellers = ['u1', 'u3', 'u2']
  const pick = arr => arr[Math.floor(rand() * arr.length)]
  const at = (offsetDays, h, m) => {
    const d = new Date()
    d.setDate(d.getDate() - offsetDays)
    d.setHours(h, m, Math.floor(rand() * 59), 0)
    return d.toISOString()
  }

  const sales = []
  let folio = 1000
  for (let off = 17; off >= 0; off--) {
    const n = off === 0 ? 5 : 2 + Math.floor(rand() * 3)
    for (let i = 0; i < n; i++) {
      const curH = new Date().getHours()
    const maxH = Math.max(10, Math.min(14, curH))
    const hour = off === 0 ? 9 + Math.floor(rand() * (maxH - 9 + 1)) : 10 + Math.floor(rand() * 8)
      const itemCount = 1 + Math.floor(rand() * 3)
      const used = new Set()
      const items = []
      for (let k = 0; k < itemCount; k++) {
        const p = products[Math.floor(rand() * products.length)]
        if (!p || used.has(p.id)) continue
        used.add(p.id)
        const units = 1 + Math.floor(rand() * 3)
        items.push({
          productId: p.id,
          nombre: `${p.marca} ${p.linea}`,
          color: p.color,
          hex: p.hex,
          acabado: p.acabado,
          presentacion: p.presentacion,
          unitPrice: p.precio,
          units,
          liters: units * p.presentacion
        })
      }
      if (!items.length) continue
      const subtotal = round(items.reduce((s, it) => s + it.unitPrice * it.units, 0))
      let discountPct = 0
      let discountAuthBy = null
      if (rand() < 0.16) {
        discountPct = [5, 8, 10][Math.floor(rand() * 3)]
        discountAuthBy = 'u2'
      }
      const r = rand()
      const metodoPago = r < 0.45 ? 'efectivo' : r < 0.78 ? 'tarjeta' : 'transferencia'
      folio++
      sales.push({
        id: uid(),
        folio,
        fecha: at(off, hour, Math.floor(rand() * 59)),
        tipo: 'venta',
        userId: pick(sellers),
        clientId: rand() < 0.55 ? pick(clients).id : null,
        metodoPago,
        discountPct,
        discountAuthBy,
        items,
        subtotal,
        total: round(subtotal * (1 - discountPct / 100))
      })
    }
  }

  const hasMethod = m => sales.some(s => sameLocalDay(s.fecha, new Date()) && s.metodoPago === m)

  if (!hasMethod('efectivo')) {
    sales.push(mkSale(++folio, 'p1', 1, 'efectivo', 'u1', 'c2'))
  }
  if (!hasMethod('transferencia')) {
    sales.push(mkSale(++folio, 'p3', 1, 'transferencia', 'u3', 'c1'))
  }
  if (!hasMethod('tarjeta')) {
    sales.push(mkSale(++folio, 'p7', 2, 'tarjeta', 'u1', null))
  }

  function mkSale(f, pid, units, metodo, userId, clientId) {
    const p = products.find(x => x.id === pid)
    const item = {
      productId: p.id,
      nombre: `${p.marca} ${p.linea}`,
      color: p.color,
      hex: p.hex,
      acabado: p.acabado,
      presentacion: p.presentacion,
      unitPrice: p.precio,
      units,
      liters: units * p.presentacion
    }
    return {
      id: uid(),
      folio: f,
      fecha: new Date().toISOString(),
      tipo: 'venta',
      userId,
      clientId,
      metodoPago: metodo,
      discountPct: 0,
      discountAuthBy: null,
      items: [item],
      subtotal: item.unitPrice * item.units,
      total: item.unitPrice * item.units
    }
  }

  function sameLocalDay(iso, ref) {
    const d = new Date(iso)
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
  }

  const efOf = refDate =>
    sales
      .filter(s => s.metodoPago === 'efectivo' && sameLocalDay(s.fecha, refDate))
      .reduce((sum, s) => sum + s.total, 0)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const efYest = efOf(yesterday)
  const retiroYest = 300
  const cashSessions = [
    {
      id: uid(),
      openedAt: at(1, 8, 52),
      closedAt: at(1, 20, 4),
      openedBy: 'u1',
      closedBy: 'u2',
      fondo: 1500,
      retiros: [{ id: uid(), monto: retiroYest, motivo: 'Compra de insumos de limpieza', ts: at(1, 13, 20), solicitadoPor: 'u1', autorizadoPor: 'u2' }],
      conteo: Math.round(1500 + efYest - retiroYest),
      diff: 0
    },
    {
      id: uid(),
      openedAt: at(0, 8, 41),
      closedAt: null,
      openedBy: 'u2',
      closedBy: null,
      fondo: 2000,
      retiros: [],
      conteo: null,
      diff: null
    }
  ]

  const clockEvents = []
  for (let off = 1; off <= 20; off++) {
    users.forEach(u => {
      if (rand() < 0.14) return
      const inMin = Math.floor(8 * 60 + rand() * 50)
      clockEvents.push({ id: uid(), userId: u.id, type: 'in', ts: at(off, Math.floor(inMin / 60), inMin % 60) })
      const outMin = Math.floor(17 * 60 + rand() * 100)
      clockEvents.push({ id: uid(), userId: u.id, type: 'out', ts: at(off, Math.floor(outMin / 60), outMin % 60) })
    })
  }
  const todayIns = [
    ['u1', 8, 47],
    ['u2', 8, 39],
    ['u3', 9, 22],
    ['u4', 10, 15],
    ['u5', 8, 58]
  ]
  todayIns.forEach(([uidv, h, m]) => {
    clockEvents.push({ id: uid(), userId: uidv, type: 'in', ts: at(0, h, m) })
  })
  ;[['u2', 17, 2], ['u3', 16, 40]].forEach(([uidv, h, m]) => {
    clockEvents.push({ id: uid(), userId: uidv, type: 'out', ts: at(0, h, m) })
  })

  return {
    users,
    products,
    clients,
    sales: sales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    cashSessions,
    clockEvents,
    auditLog: [],
    counters: { folio },
    currentUserId: null
  }
}

function round(n) {
  return Math.round(n * 100) / 100
}
