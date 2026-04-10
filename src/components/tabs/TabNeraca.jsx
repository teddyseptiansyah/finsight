import React, { useMemo, useContext, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ACCT } from '../../lib/parser'
import { fmt, fmtFull } from '../../lib/format'
import { Card, Grid, Empty, ChartTip } from '../ui'
import { CoaContext } from '../../lib/CoaContext'

const F = 'Arial, sans-serif'

// ── Warna per seksi ─────────────────────────────────────────
const C = {
  aL:   '#1B5FCC', // aktiva lancar
  aT:   '#6B3FBF', // aktiva tetap
  aX:   '#0870A4', // aktiva lain
  hL:   '#CC2200', // hutang lancar
  hP:   '#A05C00', // hutang panjang
  ek:   '#1A7A40', // ekuitas
}
const PIE_COLORS_AKTIVA  = [C.aL, C.aT, C.aX]
const PIE_COLORS_PASIVA  = [C.hL, C.hP, C.ek]

// ── Struktur grup neraca ─────────────────────────────────────
const NERACA_GROUPS = [
  { prefix: '11', label: 'Aktiva Lancar',        totalNo: '11999999', section: 'aktiva', color: C.aL },
  { prefix: '12', label: 'Aktiva Tetap',          totalNo: '12999999', section: 'aktiva', color: C.aT },
  { prefix: '13', label: 'Aktiva Lain-Lain',      totalNo: '13999999', section: 'aktiva', color: C.aX },
  { prefix: '21', label: 'Hutang Lancar',          totalNo: '21999999', section: 'pasiva', color: C.hL },
  { prefix: '22', label: 'Hutang Jangka Panjang', totalNo: '22999999', section: 'pasiva', color: C.hP },
  { prefix: '3',  label: 'Ekuitas',               totalNo: '39999999', section: 'pasiva', color: C.ek },
]
const SUMMARY_NOS = new Set([
  '11999999','12999999','13999999','19999999',
  '21999999','22999999','29999999','39999999',
])
const LR_FIRST = new Set(['4','5','6','7','8','9'])

// ── Komponen dropdown grup ───────────────────────────────────
function GroupBlock({ grp, items, grpTotal, totalAktiva, openCoa, months, rows }) {
  const [open, setOpen] = useState(false)
  const pct = v => Math.abs(totalAktiva) > 0
    ? `${(Math.abs(v) / Math.abs(totalAktiva) * 100).toFixed(1)}%` : '—'

  // Tren per bulan untuk grup ini
  const trendData = useMemo(() =>
    (months || []).map((mo, i) => ({
      mo,
      Saldo: (rows[grp.totalNo] || [])[i] || 0,
    })), [months, rows, grp.totalNo])

  const hasValues = items.length > 0
  const isPos = grpTotal >= 0

  return (
    <div style={{
      border: '1px solid var(--rule)',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'var(--card)',
    }}>
      {/* ── Header baris (klik untuk buka/tutup) */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', cursor: 'pointer',
          background: open ? 'var(--raised)' : 'var(--card)',
          transition: 'background .15s',
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--raised)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'var(--card)' }}
      >
        {/* Color dot */}
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: grp.color, flexShrink: 0 }} />

        {/* Label */}
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', fontFamily: F }}>{grp.label}</span>
          {hasValues && (
            <span style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 8, fontFamily: F }}>
              {items.length} akun
            </span>
          )}
        </div>

        {/* No. akun total */}
        <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: F }}>{grp.totalNo}</span>

        {/* Nilai */}
        <span style={{
          fontSize: 14, fontWeight: 700, color: isPos ? 'var(--t1)' : 'var(--neg)',
          fontFamily: F, minWidth: 120, textAlign: 'right',
        }}>{fmtFull(grpTotal)}</span>

        {/* % aktiva */}
        <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: F, minWidth: 48, textAlign: 'right' }}>
          {pct(grpTotal)}
        </span>

        {/* Bar mini */}
        <div style={{ width: 60, height: 6, background: 'var(--rule)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${Math.min(100, Math.abs(grpTotal) / Math.abs(totalAktiva) * 100)}%`,
            background: grp.color,
            transition: 'width .4s',
          }} />
        </div>

        {/* Chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--t4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* ── Panel detail (expand) */}
      {open && (
        <div style={{ borderTop: '1px solid var(--rule)' }}>

          {/* Mini trend chart */}
          <div style={{ padding: '16px 16px 0', background: 'var(--surface)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10, fontFamily: F }}>
              Tren {grp.label}
            </div>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={trendData} margin={{ top: 2, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="mo" tick={{ fontSize: 9, fontFamily: F }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmt} width={46} tick={{ fontSize: 9, fontFamily: F }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 6, fontSize: 10, fontFamily: F }}
                  formatter={v => fmtFull(v)}
                />
                <ReferenceLine y={0} stroke="var(--rule)" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="Saldo" stroke={grp.color} strokeWidth={2}
                  dot={{ r: 2.5, fill: grp.color }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabel sub-akun */}
          {hasValues ? (
            <div style={{ background: 'var(--surface)' }}>
              {/* Header tabel */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 130px 64px',
                padding: '8px 16px',
                borderTop: '1px solid var(--rule)',
                borderBottom: '1px solid var(--rule)',
              }}>
                {['Nama Akun', 'No. COA', 'Saldo', '% Aktiva'].map((h, i) => (
                  <div key={i} style={{
                    fontSize: 9, fontWeight: 700, color: 'var(--t4)',
                    letterSpacing: '.08em', textTransform: 'uppercase',
                    textAlign: i >= 2 ? 'right' : 'left',
                    fontFamily: F,
                  }}>{h}</div>
                ))}
              </div>

              {/* Baris akun */}
              {items.map((r, idx) => (
                <div key={r.no}
                  onClick={() => openCoa?.({ label: r.name, acctNo: r.no, prefix: r.no.slice(0,4), color: grp.color })}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 100px 130px 64px',
                    padding: '8px 16px',
                    borderBottom: idx < items.length - 1 ? '1px solid var(--rule2)' : 'none',
                    cursor: 'pointer', transition: 'background .1s',
                    background: idx % 2 === 0 ? 'var(--surface)' : 'var(--card)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--raised)'}
                  onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'var(--surface)' : 'var(--card)'}
                >
                  <div style={{ fontSize: 12, color: 'var(--t2)', fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--t4)', fontSize: 10 }}>└</span>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: F }}>{r.no}</div>
                  <div style={{
                    fontSize: 12, fontFamily: F, textAlign: 'right',
                    color: r.val < 0 ? 'var(--neg)' : 'var(--t2)',
                    fontWeight: 600,
                  }}>{fmtFull(r.val)}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: F, textAlign: 'right' }}>
                    {pct(r.val)}
                  </div>
                </div>
              ))}

              {/* Subtotal */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 130px 64px',
                padding: '10px 16px',
                background: 'var(--raised)',
                borderTop: '2px solid var(--rule)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', fontFamily: F }}>
                  Total {grp.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: F }}>{grp.totalNo}</div>
                <div style={{
                  fontSize: 13, fontWeight: 700, textAlign: 'right', fontFamily: F,
                  color: grpTotal < 0 ? 'var(--neg)' : 'var(--t1)',
                }}>{fmtFull(grpTotal)}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'right', fontFamily: F, fontWeight: 600 }}>
                  {pct(grpTotal)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', fontSize: 12, color: 'var(--t4)', fontFamily: F, textAlign: 'center', background: 'var(--surface)' }}>
              Tidak ada akun detail tersedia
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── TabNeraca utama ──────────────────────────────────────────
export default function TabNeraca({ data, months: m }) {
  const { openCoa } = useContext(CoaContext) || {}
  const rows    = data?.rows    || {}
  const rawRows = data?.rawRows || []
  const li      = (m?.length || 0) - 1

  const get = no => li >= 0 ? ((rows[no] || [])[li] || 0) : 0

  // ── Totals ──────────────────────────────────────────────────
  const totalAktiva = get(ACCT.TOTAL_AKTIVA)
  const aL  = get(ACCT.AKTIVA_LANCAR)
  const aT  = get(ACCT.AKTIVA_TETAP)
  const aX  = get(ACCT.AKTIVA_LAIN)
  const hL  = get(ACCT.HUT_LANCAR)
  const hP  = get(ACCT.HUT_PJP)
  const ek  = get(ACCT.EKUITAS)
  const totalPasiva = hL + hP + ek

  // ── Baris detail per grup ───────────────────────────────────
  const neracaRows = useMemo(() => rawRows.filter(r => {
    if (!r.no) return false
    if (LR_FIRST.has(String(r.no)[0])) return false
    if (SUMMARY_NOS.has(r.no)) return false
    if (/TOTAL/i.test(r.name || '')) return false
    return ['1','2','3'].includes(String(r.no)[0])
  }).map(r => ({
    no:      r.no,
    name:    r.name || r.no,
    val:     li >= 0 ? (r.values?.[li] || 0) : 0,
    values:  r.values || [],
    grpLabel: NERACA_GROUPS.find(g => r.no.startsWith(g.prefix))?.label || 'Lainnya',
    section:  NERACA_GROUPS.find(g => r.no.startsWith(g.prefix))?.section || 'aktiva',
  })).filter(r => r.val !== 0), [rawRows, li])

  // ── Tren bulanan KPI utama ──────────────────────────────────
  const trendKpi = useMemo(() => (m || []).map((mo, i) => ({
    mo,
    'Aktiva Lancar':   (rows[ACCT.AKTIVA_LANCAR] || [])[i] || 0,
    'Aktiva Tetap':    (rows[ACCT.AKTIVA_TETAP]  || [])[i] || 0,
    'Hutang Lancar':   (rows[ACCT.HUT_LANCAR]    || [])[i] || 0,
    'Hutang Jk Panjang': (rows[ACCT.HUT_PJP]     || [])[i] || 0,
    'Ekuitas':         (rows[ACCT.EKUITAS]        || [])[i] || 0,
  })), [rows, m])

  // ── Tren Total Aktiva vs Total Pasiva ───────────────────────
  const trendBalance = useMemo(() => (m || []).map((mo, i) => {
    const ta = (rows[ACCT.TOTAL_AKTIVA] || [])[i] || 0
    const tp = ((rows[ACCT.HUT_LANCAR] || [])[i] || 0)
             + ((rows[ACCT.HUT_PJP]    || [])[i] || 0)
             + ((rows[ACCT.EKUITAS]    || [])[i] || 0)
    return { mo, 'Total Aktiva': ta, 'Total Pasiva': tp }
  }), [rows, m])

  // ── Pie data ────────────────────────────────────────────────
  const asetPie = [
    { name: 'Aktiva Lancar',    value: Math.abs(aL) },
    { name: 'Aktiva Tetap',     value: Math.abs(aT) },
    { name: 'Aktiva Lain-Lain', value: Math.abs(aX) },
  ].filter(d => d.value > 0)

  const pasivaPie = [
    { name: 'Hutang Lancar',      value: Math.abs(hL) },
    { name: 'Hutang Jk Panjang',  value: Math.abs(hP) },
    { name: 'Ekuitas',            value: Math.abs(ek) },
  ].filter(d => d.value > 0)

  // ── Stacked bar: komposisi aktiva per bulan ─────────────────
  const stackedAktiva = useMemo(() => (m || []).map((mo, i) => ({
    mo,
    'Aktiva Lancar':    (rows[ACCT.AKTIVA_LANCAR] || [])[i] || 0,
    'Aktiva Tetap':     (rows[ACCT.AKTIVA_TETAP]  || [])[i] || 0,
    'Aktiva Lain-Lain': (rows[ACCT.AKTIVA_LAIN]   || [])[i] || 0,
  })), [rows, m])

  if (!m?.length) return <Empty text="Data Neraca tidak tersedia — upload file Neraca" />

  const diff       = Math.abs(totalAktiva) - Math.abs(totalPasiva)
  const isBalanced = Math.abs(diff) < 1_000
  const pct        = v => Math.abs(totalAktiva) > 0
    ? `${(Math.abs(v) / Math.abs(totalAktiva) * 100).toFixed(1)}%` : '—'

  const tipStyle = { background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 11, fontFamily: F }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── 1. KPI bar ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Aktiva',        val: totalAktiva, color: C.aL,  sub: '100%' },
          { label: 'Aktiva Lancar',        val: aL,          color: C.aL,  sub: pct(aL) },
          { label: 'Aktiva Tetap',         val: aT,          color: C.aT,  sub: pct(aT) },
          { label: 'Total Liabilitas',     val: hL + hP,     color: C.hL,  sub: pct(hL + hP) },
          { label: 'Ekuitas',              val: ek,           color: C.ek,  sub: pct(ek) },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--card)', border: '1px solid var(--rule)',
            borderRadius: 10, padding: '14px 16px',
            borderTop: `3px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: F }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.val < 0 ? 'var(--neg)' : 'var(--t1)', letterSpacing: '-0.5px', fontFamily: F }}>{fmtFull(s.val)}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, fontFamily: F }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 2. Balance warning ─────────────────────────────── */}
      {!isBalanced && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--warn-dim)', border: '1px solid var(--warn)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warn)', fontFamily: F }}>
            Neraca belum balance — selisih Aktiva vs Pasiva: {fmtFull(Math.abs(diff))}
          </span>
        </div>
      )}

      {/* ── 3. Row chart: pie komposisi + stacked bar ──────── */}
      <Grid cols={2} gap={16}>
        <Card title="Komposisi Aktiva" sub={`Akhir periode · ${m[li] || ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={asetPie} cx="50%" cy="50%" outerRadius={76} innerRadius={40} dataKey="value" paddingAngle={2}>
                  {asetPie.map((_, i) => <Cell key={i} fill={PIE_COLORS_AKTIVA[i]} />)}
                </Pie>
                <Tooltip formatter={v => fmtFull(v)} contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {asetPie.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS_AKTIVA[i], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--t2)', fontFamily: F }}>{d.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', fontFamily: F }}>{fmtFull(d.value)}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: F }}>
                    {totalAktiva ? `${(d.value / Math.abs(totalAktiva) * 100).toFixed(1)}%` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Struktur Pendanaan" sub="Liabilitas & Ekuitas">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={pasivaPie} cx="50%" cy="50%" outerRadius={76} innerRadius={40} dataKey="value" paddingAngle={2}>
                  {pasivaPie.map((_, i) => <Cell key={i} fill={PIE_COLORS_PASIVA[i]} />)}
                </Pie>
                <Tooltip formatter={v => fmtFull(v)} contentStyle={tipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pasivaPie.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS_PASIVA[i], flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--t2)', fontFamily: F }}>{d.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', fontFamily: F }}>{fmtFull(d.value)}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: F }}>
                    {totalAktiva ? `${(d.value / Math.abs(totalAktiva) * 100).toFixed(1)}%` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Grid>

      {/* ── 4. Tren Aktiva vs Pasiva ────────────────────────── */}
      <Card title="Tren Total Aktiva vs Pasiva" sub="Pergerakan bulanan — keseimbangan neraca">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendBalance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--rule2)" />
            <XAxis dataKey="mo" tick={{ fontSize: 10, fontFamily: F }} />
            <YAxis tickFormatter={fmt} width={54} tick={{ fontSize: 10, fontFamily: F }} />
            <Tooltip content={<ChartTip fmt={fmtFull} />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: F }} />
            <Line dataKey="Total Aktiva" stroke={C.aL} strokeWidth={2.5} dot={{ r: 3, fill: C.aL }} />
            <Line dataKey="Total Pasiva" stroke={C.hL} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: C.hL }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── 5. Komposisi aktiva stacked per bulan ──────────── */}
      <Card title="Komposisi Aktiva per Bulan" sub="Stacked — Aktiva Lancar · Tetap · Lain">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stackedAktiva} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid vertical={false} stroke="var(--rule2)" />
            <XAxis dataKey="mo" tick={{ fontSize: 10, fontFamily: F }} />
            <YAxis tickFormatter={fmt} width={54} tick={{ fontSize: 10, fontFamily: F }} />
            <Tooltip content={<ChartTip fmt={fmtFull} />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: F }} />
            <Bar dataKey="Aktiva Lancar"    fill={C.aL} stackId="a" />
            <Bar dataKey="Aktiva Tetap"     fill={C.aT} stackId="a" />
            <Bar dataKey="Aktiva Lain-Lain" fill={C.aX} stackId="a" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── 6. Tren KPI per komponen ───────────────────────── */}
      <Card title="Tren per Komponen Neraca" sub="Aktiva Lancar · Tetap · Hutang · Ekuitas">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendKpi} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--rule2)" />
            <XAxis dataKey="mo" tick={{ fontSize: 10, fontFamily: F }} />
            <YAxis tickFormatter={fmt} width={54} tick={{ fontSize: 10, fontFamily: F }} />
            <Tooltip content={<ChartTip fmt={fmtFull} />} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: F }} />
            <Line dataKey="Aktiva Lancar"      stroke={C.aL} strokeWidth={2} dot={{ r: 2 }} />
            <Line dataKey="Aktiva Tetap"       stroke={C.aT} strokeWidth={2} dot={{ r: 2 }} />
            <Line dataKey="Hutang Lancar"      stroke={C.hL} strokeWidth={2} dot={{ r: 2 }} />
            <Line dataKey="Hutang Jk Panjang"  stroke={C.hP} strokeWidth={2} dot={{ r: 2 }} />
            <Line dataKey="Ekuitas"            stroke={C.ek} strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ── 7. Detail neraca dengan dropdown per grup ──────── */}
      <Card
        title="Neraca Lengkap"
        sub={`Periode berakhir · ${m[li] || ''} — klik grup untuk detail COA`}
      >
        {/* Header tabel */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 130px 64px 60px 20px',
          padding: '8px 16px 10px',
          borderBottom: '2px solid var(--rule)',
        }}>
          {['Kelompok', 'No. Akun', 'Saldo', '% Aktiva', 'Porsi', ''].map((h, i) => (
            <div key={i} style={{
              fontSize: 9, fontWeight: 700, color: 'var(--t4)',
              letterSpacing: '.08em', textTransform: 'uppercase',
              textAlign: i >= 2 ? 'right' : 'left', fontFamily: F,
            }}>{h}</div>
          ))}
        </div>

        {/* ── AKTIVA ── */}
        <div style={{ padding: '12px 16px 4px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8, fontFamily: F }}>
            AKTIVA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NERACA_GROUPS.filter(g => g.section === 'aktiva').map(grp => {
              const items    = neracaRows.filter(r => r.grpLabel === grp.label)
              const grpTotal = get(grp.totalNo)
              if (grpTotal === 0 && items.length === 0) return null
              return (
                <GroupBlock key={grp.prefix} grp={grp} items={items}
                  grpTotal={grpTotal} totalAktiva={totalAktiva}
                  openCoa={openCoa} months={m} rows={rows} />
              )
            })}
          </div>
          {/* Total Aktiva */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', marginTop: 8,
            background: 'var(--raised)', borderRadius: 8,
            border: '1px solid var(--rule)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', fontFamily: F }}>TOTAL AKTIVA</span>
            <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: F }}>{ACCT.TOTAL_AKTIVA}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', fontFamily: F }}>{fmtFull(totalAktiva)}</span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--rule)', margin: '8px 16px' }} />

        {/* ── PASIVA ── */}
        <div style={{ padding: '4px 16px 16px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8, fontFamily: F }}>
            LIABILITAS & EKUITAS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {NERACA_GROUPS.filter(g => g.section === 'pasiva').map(grp => {
              const items    = neracaRows.filter(r => r.grpLabel === grp.label)
              const grpTotal = get(grp.totalNo)
              if (grpTotal === 0 && items.length === 0) return null
              return (
                <GroupBlock key={grp.prefix} grp={grp} items={items}
                  grpTotal={grpTotal} totalAktiva={totalAktiva}
                  openCoa={openCoa} months={m} rows={rows} />
              )
            })}
          </div>
          {/* Total Pasiva */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', marginTop: 8,
            background: 'var(--raised)', borderRadius: 8,
            border: `1px solid ${isBalanced ? 'var(--rule)' : 'var(--warn)'}`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', fontFamily: F }}>TOTAL PASIVA</span>
            <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: F }}></span>
            <span style={{ fontSize: 14, fontWeight: 800, color: isBalanced ? 'var(--t1)' : 'var(--warn)', fontFamily: F }}>
              {fmtFull(totalPasiva)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}