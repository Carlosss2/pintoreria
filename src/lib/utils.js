export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const pad = n => String(n).padStart(2, '0')

export const money = n =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0)

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const dayKeyOf = iso => dayKey(new Date(iso))

export const daysAgoDate = n => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export const fmtDate = iso =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })

export const fmtFullDate = iso =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export const fmtTime = iso =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export const fmtDT = iso => `${fmtDate(iso)} · ${fmtTime(iso)}`

export const initials = name =>
  name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()

export const LATE_LIMIT_MIN = 9 * 60 + 5

export const minutesOfDay = iso => {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

export const isLateCheckIn = iso => minutesOfDay(iso) > LATE_LIMIT_MIN

export const round2 = n => Math.round((Number(n) || 0) * 100) / 100

export const ROLE_LABEL = {
  vendedor: 'Vendedor',
  supervisor: 'Supervisor',
  dueno: 'Dirección'
}

export const PAY_LABEL = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia'
}

export const FINISHES = ['Mate', 'Satín', 'Semibrillante', 'Brillante']
export const PRESENTATIONS = [1, 4, 19]
