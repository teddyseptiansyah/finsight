import { useState, useRef } from 'react'
import { useOutsideClick } from './PeriodPicker'
import { ACCT, totalOf } from '../../lib/parser'
import TabVariance from '../tabs/TabVariance'

// ── Constants ──────────────────────────────────────────────
const VARIANCE_MENU = [
  {
    id: 'budget',
    label: 'Budget Biaya',
    desc: 'Input anggaran biaya operasional per bulan',
    accent: '#B45309',
    dim: '#FFFBEB',
    icon: '📊',
  },
  {
    id: 'target',
    label: 'Target Pendapatan',
    desc: 'Input target pendapatan per bulan',
    accent: '#2563EB',
    dim: '#EFF6FF',
    icon: '🎯',
  },
]

const BUDGET_ITEMS = [
  { no: ACCT.HPP,        label: 'Harga Pokok Penjualan' },
  { no: ACCT.BIAYA_MKT,  label: 'Biaya Marketing' },
  { no: ACCT.BIAYA_KARY, label: 'Biaya Karyawan' },
  { no: ACCT.BIAYA_GEDUNG,label: 'Biaya Gedung & Operasional' },
  { no: ACCT.BIAYA_UMUM, label: 'Biaya Umum' },
  { no: ACCT.BIAYA_OPS_LN,label: 'Biaya Operasional Lainnya' },
]

const TARGET_ITEMS = [
  { no: ACCT.PENDAPATAN, label: 'Pendapatan Bersih' },
]

// ── InputCard ──────────────────────────────────────────────
function InputCard({ type, items, allMonths, activeMonths, onSave, onReset }) {
  const [vals, setVals] = useState({})

  const set = (no, mon, raw) => {
    const n = parseFloat(raw.replace(/[^\d.-]/g, '')) || 0
    setVals(p => ({ ...p, [`${no}__${mon}`]: n }))
  }

  const handleSave = () => {
    const out = {}
    items.forEach(item => {
      allMonths.forEach(mon => {
        const v = vals[`${item.no}__${mon}`] ?? 0
        if (!out[item.no]) out[item.no] = {}
        out[item.no][mon] = v
      })
    })
    onSave(out)
  }

  return (
    <div style={{ background: 'var(--canvas)', border: '1px solid var(--line)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--f)', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--ink4)', fontWeight: 500 }}>Akun</th>
              {activeMonths.map(m => (
                <th key={m} style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--ink4)', fontWeight: 500 }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.no}>
                <td style={{ padding: '4px 8px', color: 'var(--ink2)', fontWeight: 500 }}>{item.label}</td>
                {activeMonths.map(mon => (
                  <td key={mon} style={{ padding: '4px 4px' }}>
                    <input
                      type="text"
                      defaultValue=""
                      onBlur={e => set(item.no, mon, e.target.value)}
                      style={{ width: 80, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 11, border: '1px solid var(--line)', borderRadius: 4, padding: '2px 6px' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={handleSave} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--f)' }}>
          Simpan &amp; Lihat Variance
        </button>
        <button onClick={onReset} style={{ background: 'var(--sunken)', color: 'var(--ink3)', border: '1px solid var(--line)', borderRadius: 6, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--f)' }}>
          Reset
        </button>
      </div>
    </div>
  )
}

// ── VarianceTable ──────────────────────────────────────────
function VarianceTable({ type, items, savedData, activeMonths, allMonths, lrData }) {
  const lr = lrData?.rows || {}

  return (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--f)', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--ink4)', fontWeight: 500 }}>Akun</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--ink4)', fontWeight: 500 }}>Budget</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--ink4)', fontWeight: 500 }}>Realisasi</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--ink4)', fontWeight: 500 }}>Selisih</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--ink4)', fontWeight: 500 }}>%</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const budget = Object.values(savedData?.[item.no] || {}).reduce((a, b) => a + b, 0)
            const real   = totalOf(lr, item.no)
            const diff   = type === 'target' ? real - budget : budget - real
            const pct    = budget !== 0 ? (diff / Math.abs(budget)) * 100 : null
            const good   = diff >= 0
            return (
              <tr key={item.no} style={{ borderBottom: '1px solid var(--line2)' }}>
                <td style={{ padding: '6px 8px', color: 'var(--ink2)', fontWeight: 500 }}>{item.label}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink3)' }}>{budget.toLocaleString('id-ID')}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--ink2)' }}>{real.toLocaleString('id-ID')}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: good ? 'var(--pos)' : 'var(--neg)', fontWeight: 600 }}>
                  {good ? '+' : ''}{diff.toLocaleString('id-ID')}
                </td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--mono)', color: good ? 'var(--pos)' : 'var(--neg)' }}>
                  {pct != null ? `${good ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── VarianceSection ────────────────────────────────────────
function VarianceSection({ allMonths, activeMonths, manualBudget, setManualBudget, filteredLr }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active,   setActive]   = useState(null)
  const menuRef = useRef()
  useOutsideClick(menuRef, () => setMenuOpen(false))

  const hasBudget = Object.keys(manualBudget.biaya  || {}).length > 0
  const hasTarget = Object.keys(manualBudget.target || {}).length > 0
  const hasAny    = hasBudget || hasTarget

  const cfg = active ? VARIANCE_MENU.find(m => m.id === active) : null

  const periodLabel = activeMonths.length === allMonths.length ? 'Semua bulan'
    : activeMonths.length === 1 ? activeMonths[0]
    : `${activeMonths[0]} – ${activeMonths[activeMonths.length - 1]}`

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          <div className="dd-wrap" ref={menuRef}>
            <button className={`top-btn${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(o => !o)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              {cfg ? `Input ${cfg.label}` : 'Input Budget / Target'}
              <svg style={{ width: 9, height: 9, transition: 'transform .14s', transform: menuOpen ? 'rotate(180deg)' : 'none' }} viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 2.5l3 3 3-3"/>
              </svg>
            </button>

            {menuOpen && (
              <div className="dd-panel vm-panel">
                {VARIANCE_MENU.map(m => (
                  <div key={m.id} className="vm-item"
                    style={active === m.id ? { background: m.dim } : {}}
                    onClick={() => { setActive(p => p === m.id ? null : m.id); setMenuOpen(false) }}
                  >
                    <div className="vm-icon" style={active === m.id ? { background: m.accent, borderColor: m.accent, color: '#fff' } : {}}>
                      {m.icon}
                    </div>
                    <div>
                      <div className="vm-label" style={active === m.id ? { color: m.accent } : {}}>{m.label}</div>
                      <div className="vm-desc">{m.desc}</div>
                    </div>
                    {active === m.id && (
                      <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.accent} strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasBudget && (
            <div className="chip-saved" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309' }}>
              <span style={{ width: 6, height: 6, borderRadius: 0, background: '#B45309', display: 'inline-block' }}/>
              Budget tersimpan
            </div>
          )}
          {hasTarget && (
            <div className="chip-saved" style={{ background: 'var(--lime-bg)', border: '1px solid #BFDBFE', color: 'var(--ink)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 0, background: 'var(--lime)', display: 'inline-block' }}/>
              Target tersimpan
            </div>
          )}
        </div>

        <div style={{ fontFamily: 'var(--f)', fontSize: 12, color: 'var(--ink4)' }}>
          Periode:&nbsp;<span style={{ color: 'var(--ink2)', fontWeight: 500 }}>{periodLabel}</span>
        </div>
      </div>

      {/* ── Input Card ── */}
      {active === 'budget' && (
        <InputCard type="budget" items={BUDGET_ITEMS}
          allMonths={allMonths} activeMonths={activeMonths}
          onSave={v  => setManualBudget(p => ({ ...p, biaya: v }))}
          onReset={() => setManualBudget(p => ({ ...p, biaya: {} }))}
        />
      )}
      {active === 'target' && (
        <InputCard type="target" items={TARGET_ITEMS}
          allMonths={allMonths} activeMonths={activeMonths}
          onSave={v  => setManualBudget(p => ({ ...p, target: v }))}
          onReset={() => setManualBudget(p => ({ ...p, target: {} }))}
        />
      )}

      {/* ── Variance Results ── */}
      {hasAny ? (
        <>
          <div className="vr-sec-label">Variance — {periodLabel}</div>

          {hasBudget && (
            <>
              <div style={{ fontFamily: 'var(--f)', fontSize: 12, color: '#B45309', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>Budget Biaya</div>
              <VarianceTable type="budget" items={BUDGET_ITEMS}
                savedData={manualBudget.biaya} activeMonths={activeMonths} allMonths={allMonths}
                lrData={filteredLr}/>
            </>
          )}

          {hasTarget && (
            <>
              <div style={{ fontFamily: 'var(--f)', fontSize: 12, color: 'var(--ink)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8, marginTop: hasBudget ? 20 : 0, fontWeight: 500 }}>Target Pendapatan</div>
              <VarianceTable type="target" items={TARGET_ITEMS}
                savedData={manualBudget.target} activeMonths={activeMonths} allMonths={allMonths}
                lrData={filteredLr}/>
            </>
          )}
        </>
      ) : (
        <div className="vr-empty">
          <div className="vr-empty-icon">📊</div>
          <div className="vr-empty-t1">Belum ada data budget / target</div>
          <div className="vr-empty-t2">Pilih "Input Budget / Target" → isi angka → klik Simpan &amp; Lihat Variance</div>
        </div>
      )}

      <TabVariance
        lrData={filteredLr}
        budgetData={null}
        manualBudget={manualBudget}
        months={activeMonths}
      />
    </div>
  )
}

export default VarianceSection
