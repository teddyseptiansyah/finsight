export const fmt = (v, short = true) => {
  if (v == null || isNaN(v)) return '—'
  const a = Math.abs(v), s = v < 0 ? '-' : ''
  if (!short) return s + new Intl.NumberFormat('id-ID').format(Math.round(a))
  if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B'
  if (a >= 1e6) return s + (a / 1e6).toFixed(1) + 'jt'
  if (a >= 1e3) return s + (a / 1e3).toFixed(0) + 'rb'
  return s + a.toFixed(0)
}

export const fmtFull = v => fmt(v, false)

export const pct = (v, total) =>
  total ? ((v / total) * 100).toFixed(1) + '%' : '—'

export const sign = v => (v >= 0 ? '+' : '')

export const goodBad = (v, isRevenue) =>
  isRevenue ? v >= 0 : v <= 0
