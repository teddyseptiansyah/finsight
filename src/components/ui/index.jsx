/* ── Card ─────────────────────────────────────────────────── */
export function Card({ title, sub, children, accent, style = {} }) {
  return (
    <div style={{
      background: 'var(--canvas)', border: '1px solid var(--line)',
      borderRadius: 'var(--r3)', overflow: 'hidden',
      boxShadow: 'var(--s1)', ...style,
    }}>
      {(title || sub) && (
        <div style={{
          padding: '16px 20px 0', marginBottom: 16,
          borderBottom: accent ? `none` : 'none',
        }}>
          {sub && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {sub}
            </div>
          )}
          {title && (
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 400, color: 'var(--t1)', letterSpacing: '-0.3px' }}>
              {title}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: '0 20px 20px' }}>
        {children}
      </div>
    </div>
  )
}

/* ── Grid ─────────────────────────────────────────────────── */
export function Grid({ children, cols = 2, gap = 16 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap,
    }}>
      {children}
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────── */
export function Empty({ text = 'Data tidak tersedia' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 220, gap: 10,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--sunken)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--t4)', textAlign: 'center' }}>{text}</div>
    </div>
  )
}

/* ── Badge ─────────────────────────────────────────────────── */
export function Badge({ value, good, neutral }) {
  const bg    = neutral ? 'var(--sunken)' : good ? 'var(--pos-dim)'  : 'var(--neg-dim)'
  const color = neutral ? 'var(--t3)'     : good ? 'var(--pos)'      : 'var(--neg)'
  return (
    <span style={{
      display: 'inline-block', padding: '3px 9px', borderRadius: 99,
      fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500,
      background: bg, color,
    }}>{value}</span>
  )
}

/* ── Table ─────────────────────────────────────────────────── */
export function DataTable({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '8px 12px', textAlign: h.right ? 'right' : 'left',
                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 500,
                color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em',
                borderBottom: '1px solid var(--line2)', whiteSpace: 'nowrap',
              }}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--raised)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: '9px 12px',
                  borderBottom: ri < rows.length - 1 ? '1px solid var(--line)' : 'none',
                  textAlign: cell?.right || headers[ci]?.right ? 'right' : 'left',
                  fontFamily: cell?.mono ? 'var(--mono)' : 'var(--sans)',
                  fontSize: cell?.mono ? 11 : 12,
                  color: cell?.bold ? 'var(--t1)' : 'var(--t2)',
                  fontWeight: cell?.bold ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}>
                  {cell?.node ?? cell?.value ?? cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Custom chart tooltip ─────────────────────────────────── */
export function ChartTip({ active, payload, label, fmt: fmtFn }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--canvas)', border: '1px solid var(--line2)',
      borderRadius: 'var(--r2)', padding: '10px 14px', minWidth: 150,
      boxShadow: 'var(--s3)', fontSize: 11,
    }}>
      <div style={{ fontFamily: 'var(--sans)', fontWeight: 600, color: 'var(--t2)', marginBottom: 8, paddingBottom: 7, borderBottom: '1px solid var(--line)', fontSize: 11 }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: i > 0 ? 5 : 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', flex: 1 }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 500, color: 'var(--t1)' }}>
            {fmtFn ? fmtFn(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ── Section heading ─────────────────────────────────────── */
export function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)',
      letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
    }}>{children}</div>
  )
}
