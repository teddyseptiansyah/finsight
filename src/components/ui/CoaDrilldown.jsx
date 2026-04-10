import { useEffect, useRef, useState, useCallback } from 'react'
import { fmtFull } from '../../lib/format'

const fmt = (val) => {
  if (val == null || isNaN(val)) return '—'
  const abs = Math.abs(val)
  const formatted = abs.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return val < 0 ? `-${formatted}` : formatted
}

export default function CoaDrilldown({ subject, lrData, onClose }) {
  // Stack navigation: [subject, subject2, ...]
  const [stack, setStack] = useState([subject])
  const current = stack[stack.length - 1]

  const drillInto = useCallback((newSubject) => {
    setStack(s => [...s, newSubject])
  }, [])

  const goBack = useCallback(() => {
    setStack(s => s.length > 1 ? s.slice(0, -1) : s)
  }, [])

  const rows   = lrData?.rows    || {}
  const months = lrData?.months  || []
  const raw    = lrData?.rawRows || []

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  if (!current) return null

  const prefix      = current.prefix || current.acctNo?.slice(0, 3) || ''
  const exact       = current.acctNo
  const accentColor = current.color || '#1847C2'

  // ── Extract clean name from rawRow ─────────────────────────
  // Navision format: "41000501   PENJUALAN AUDIO" or "41000501NAMA"
  // parser.js already strips leading digits → r.name should be clean
  // Fallback: jika r.name masih berisi nomor di depan, strip lagi
  const cleanName = (r) => {
    const raw = r.name || ''
    // Kalau name masih berupa nomor murni (hanya digit), coba ambil dari no
    if (/^\d+$/.test(raw.trim())) return null
    // Strip nomor COA di depan jika masih ada (berbagai format separator)
    const stripped = raw
      .replace(/^\d{7,9}[\s\t\-_|]+/, '')  // "41000501   NAMA" atau "41000501-NAMA"
      .replace(/^\d{7,9}/, '')              // "41000501NAMA" tanpa separator
      .trim()
    return stripped || null
  }

  // ── Helper: deteksi akun subtotal/total/header ─────────────
  const isTotalRow = (no, name = '') => {
    if (!no) return true
    if (no.endsWith('999999') || no.endsWith('000000')) return true
    if (no.slice(-2) === '99') return true
    if (no.slice(-2) === '00') return true
    if (name && name.toUpperCase().includes('TOTAL')) return true
    return false
  }

  // ── Gather matching sub-accounts ────────────────────────────
  const subAccounts = raw
    .filter(r => {
      if (!r.no) return false
      if (exact && r.no === exact) return false
      if (isTotalRow(r.no, r.name || '')) return false
      if (prefix && r.no.startsWith(prefix)) return true
      return false
    })
    .map(r => ({
      no:    r.no,
      name:  cleanName(r) || r.no,   // fallback ke nomor jika nama tidak ada
      total: Math.abs((r.values || []).reduce((a, b) => a + (b || 0), 0)),
      values: r.values || months.map(() => 0),
    }))
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total)

  const summaryValues = rows[exact] || months.map(() => 0)
  const summaryTotal  = Math.abs(summaryValues.reduce((a, b) => a + (b || 0), 0))
  const barMax        = Math.max(...subAccounts.map(a => a.total), 1)
  const monthMax      = Math.max(...summaryValues.map(v => Math.abs(v || 0)), 1)

  // ── Sparkline ───────────────────────────────────────────────
  const Spark = ({ values, color, height = 52 }) => {
    const W = 100, H = height, p = 3
    const abs = values.map(v => Math.abs(v || 0))
    const max = Math.max(...abs, 1)
    if (abs.every(v => v === 0)) return null
    const coords = abs.map((v, i) => ({
      x: p + (i / Math.max(abs.length - 1, 1)) * (W - p * 2),
      y: H - p - (v / max) * (H - p * 2),
    }))
    const pts     = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
    const fillPts = `${coords[0].x.toFixed(1)},${H} ${pts} ${coords[coords.length-1].x.toFixed(1)},${H}`
    const gid     = `coa_${Math.random().toString(36).slice(2,6)}`
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity=".22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill={`url(#${gid})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => <circle key={i} cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} r="2.2" fill={color} />)}
      </svg>
    )
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 399,
        background: 'rgba(17,16,9,.45)',
        backdropFilter: 'blur(3px)',
        animation: 'coaFadeIn .18s ease both',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} />

      {/* ── Modal ── */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 400,
        width: 580,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 48px)',
        background: 'var(--canvas)',
        borderRadius: 14,
        border: '1px solid var(--line2)',
        boxShadow: '0 32px 80px rgba(0,0,0,.22), 0 8px 24px rgba(0,0,0,.12)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'coaPopIn .2s cubic-bezier(.2,.8,.3,1) both',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px 14px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                {stack.length > 1 && (
                  <button onClick={goBack} style={{
                    border: '1px solid var(--line2)', borderRadius: 6, background: 'var(--bg)',
                    color: 'var(--t3)', fontSize: 11, cursor: 'pointer', padding: '2px 8px',
                    fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 4,
                    flexShrink: 0, transition: 'all .1s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--line)'; e.currentTarget.style.color = 'var(--t1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--t3)' }}
                  >← Kembali</button>
                )}
                <div style={{
                  width: 11, height: 11, borderRadius: 3,
                  background: accentColor, flexShrink: 0,
                  boxShadow: `0 0 0 3px ${accentColor}28`,
                }} />
                <span style={{
                  fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 700,
                  color: 'var(--t1)', letterSpacing: '-0.3px',
                }}>
                  {current.label}
                </span>
              </div>
              {stack.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                  {stack.slice(0, -1).map((s, i) => (
                    <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>
                      {s.label} <span style={{ opacity: .4 }}>›</span>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                {exact && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10.5,
                    color: accentColor,
                    background: `${accentColor}15`,
                    border: `1px solid ${accentColor}35`,
                    borderRadius: 4, padding: '2px 8px',
                  }}>{exact}</span>
                )}
                {prefix && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: 'var(--t4)', background: 'var(--line)',
                    borderRadius: 4, padding: '2px 8px',
                  }}>prefix {prefix}xxxxxx</span>
                )}
                {current.description && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t3)' }}>
                    {current.description}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: '50%',
              border: '1px solid var(--line2)', background: 'transparent',
              color: 'var(--t3)', fontSize: 15, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all .1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--line)'; e.currentTarget.style.color = 'var(--t1)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)' }}
            >✕</button>
          </div>
        </div>

        {/* ── Hero + sparkline (2 col) ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 0, borderBottom: '1px solid var(--line)', flexShrink: 0,
        }}>
          {/* Left: total + per bulan mini */}
          <div style={{ padding: '16px 20px 14px', borderRight: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Total Kumulatif · {months.length} bln
            </div>
            <div style={{
              fontFamily: 'var(--sans)', fontSize: 26, fontWeight: 700,
              letterSpacing: '-1px', color: accentColor, lineHeight: 1, marginBottom: 12,
            }}>
              {fmtFull(summaryTotal)}
            </div>
            {/* Month mini grid 3-col */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px 4px' }}>
              {months.map((mo, i) => {
                const v = Math.abs(summaryValues[i] || 0)
                const isMax = v > 0 && v === monthMax
                return (
                  <div key={i} style={{
                    padding: '5px 6px', borderRadius: 4,
                    background: isMax ? `${accentColor}12` : 'var(--bg)',
                    border: `1px solid ${isMax ? accentColor + '45' : 'transparent'}`,
                  }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--t4)', marginBottom: 1 }}>{mo}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: isMax ? 700 : 500, color: isMax ? accentColor : 'var(--t2)' }}>
                      {v > 0 ? fmt(v) : <span style={{ color: 'var(--t4)' }}>—</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: sparkline */}
          <div style={{ padding: '16px 20px 14px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Tren Bulanan
            </div>
            {summaryValues.some(v => v !== 0) ? (
              <>
                <div style={{ height: 68 }}>
                  <Spark values={summaryValues} color={accentColor} height={68} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {months.map((mo, i) => (
                    <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 7.5, color: 'var(--t4)' }}>{mo}</span>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)' }}>tidak ada data</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Sub-akun list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 4px' }}>
          {subAccounts.length > 0 ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  Sub-Akun COA
                </span>
                <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                  color: accentColor, background: `${accentColor}15`,
                  borderRadius: 99, padding: '2px 9px',
                }}>
                  {subAccounts.length} akun
                </span>
              </div>

              {/* Table-style list */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['', 'Nama Akun', 'No. COA', 'Total', '%'].map((h, i) => (
                      <th key={i} style={{
                        fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 500,
                        color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em',
                        padding: '4px 8px', textAlign: i >= 3 ? 'right' : 'left',
                        borderBottom: '1px solid var(--line)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subAccounts.map((acct, i) => {
                    const share  = summaryTotal > 0 ? acct.total / summaryTotal * 100 : 0
                    const barPct = barMax > 0 ? acct.total / barMax * 100 : 0
                    const rank   = i + 1
                    return (
                      <tr key={i}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.cursor = '' }}
                        onClick={() => drillInto({ acctNo: acct.no, prefix: acct.no, label: acct.name, color: accentColor })}
                        style={{ transition: 'background .08s', cursor: 'pointer' }}
                        title="Klik untuk drill down"
                      >
                        {/* Rank */}
                        <td style={{ padding: '8px 8px 8px 4px', borderBottom: '1px solid var(--line)', width: 24 }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            background: rank <= 3 ? `${accentColor}20` : 'var(--bg)',
                            border: `1px solid ${rank <= 3 ? accentColor + '45' : 'var(--line)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700,
                            color: rank <= 3 ? accentColor : 'var(--t4)',
                          }}>{rank}</div>
                        </td>
                        {/* Nama */}
                        <td style={{ padding: '8px', borderBottom: '1px solid var(--line)', maxWidth: 200 }}>
                          <div style={{
                            fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 500,
                            color: 'var(--t1)', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                            {acct.name}
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--t4)', opacity: .6 }}>▸</span>
                          </div>
                          {/* Mini bar di bawah nama */}
                          <div style={{ height: 2, background: 'var(--line)', borderRadius: 99, marginTop: 5, overflow: 'hidden', width: '100%' }}>
                            <div style={{
                              height: '100%', borderRadius: 99,
                              width: `${barPct}%`,
                              background: accentColor,
                              opacity: rank <= 3 ? 0.7 : 0.35,
                              transition: 'width .4s ease',
                            }} />
                          </div>
                        </td>
                        {/* No COA */}
                        <td style={{
                          padding: '8px', borderBottom: '1px solid var(--line)',
                          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t4)',
                          whiteSpace: 'nowrap',
                        }}>
                          {acct.no}
                        </td>
                        {/* Total */}
                        <td style={{
                          padding: '8px', borderBottom: '1px solid var(--line)',
                          fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 600,
                          textAlign: 'right', color: 'var(--t1)', whiteSpace: 'nowrap',
                        }}>
                          {fmt(acct.total)}
                        </td>
                        {/* % */}
                        <td style={{
                          padding: '8px 4px 8px 8px', borderBottom: '1px solid var(--line)',
                          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500,
                          textAlign: 'right', whiteSpace: 'nowrap',
                          color: share >= 20 ? accentColor : 'var(--t4)',
                        }}>
                          {share.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: 100, gap: 8, textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, opacity: .25 }}>◻</div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 500, color: 'var(--t3)' }}>
                Tidak ada sub-akun
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--t4)', lineHeight: 1.6 }}>
                Prefix <strong>{prefix || '—'}</strong> tidak ditemukan di data LR
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--line)',
          background: 'var(--bg)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)' }}>
            Tekan <kbd style={{ background: 'var(--line2)', borderRadius: 3, padding: '1px 5px', fontSize: 8, fontFamily: 'var(--mono)' }}>Esc</kbd> untuk menutup
          </span>
          <button onClick={onClose} style={{
            fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600,
            color: 'var(--t2)', background: 'transparent',
            border: '1px solid var(--line2)', borderRadius: 6,
            padding: '6px 18px', cursor: 'pointer', transition: 'all .12s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--line)'; e.currentTarget.style.color = 'var(--t1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)' }}
          >Tutup</button>
        </div>
      </div>

      <style>{`
        @keyframes coaFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes coaPopIn  {
          from { opacity:0; transform:translate(-50%,-50%) scale(.93) }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1)   }
        }
      `}</style>
    </>
  )
}