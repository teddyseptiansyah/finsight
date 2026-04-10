import { useMemo } from 'react'
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { fmt, fmtFull } from '../../lib/format'
import { Card, Grid, Empty, DataTable, Badge } from '../ui'

const COLORS = ['#1847C2','#0D7A52','#9A5A00','#5B35B8','#0870A4','#C26018','#2E8B6A','#C2280D','#474BB3']

// Filter: akun yang NAMANYA mengandung kata "Piutang" (case-insensitive)
// Kecuali baris summary/total
const isSummary = (r) =>
  /TOTAL/i.test(r.name || '') ||
  r.no?.endsWith('999999') ||
  r.no?.endsWith('99999')

export default function TabPiutang({ data, months: m }) {
  // data = neracaData — saldo akhir per periode
  const rawRows = data?.rawRows || []
  const rows    = data?.rows    || {}
  const li      = (m?.length || 0) - 1

  // Ambil semua akun yang namanya mengandung "Piutang" dan bukan summary
  const piuRows = useMemo(() => {
    return rawRows
      .filter(r => {
        if (!r.no) return false
        if (isSummary(r)) return false
        // filter utama: nama mengandung "Piutang"
        return /piutang/i.test(r.name || '')
      })
      .map(r => ({
        no:     r.no,
        label:  r.name || r.no,
        values: r.values || (m || []).map(() => 0),
        last:   li >= 0 ? (r.values?.[li] || 0) : 0,
      }))
      .filter(r => r.values.some(v => v !== 0))
  }, [rawRows, li, m])

  // Total piutang = sum semua baris piutang di periode terakhir
  const totalPiu = piuRows.reduce((s, p) => s + Math.abs(p.last), 0)

  const piuPie = piuRows
    .map(p => ({ name: p.label, value: Math.abs(p.last) }))
    .filter(p => p.value > 0)

  const trendData = useMemo(() => (m || []).map((mo, i) => {
    const obj = { mo }
    piuRows.slice(0, 5).forEach(p => { obj[p.label] = Math.abs(p.values[i] || 0) })
    return obj
  }), [m, piuRows])

  if (!m?.length) return (
    <Empty text="File Neraca belum diupload — upload file Neraca untuk melihat data piutang." />
  )

  if (piuRows.length === 0) return (
    <Empty text="Tidak ada akun dengan nama &quot;Piutang&quot; ditemukan di file Neraca." />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Total Piutang',     value: fmtFull(totalPiu),                                   color: 'var(--blue)'   },
          { label: 'Jumlah Akun',       value: piuRows.length,                                       color: 'var(--t2)'     },
          { label: 'Piutang Terbesar',  value: fmtFull(Math.max(...piuRows.map(p => Math.abs(p.last)))), color: 'var(--warn)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--card)', border: '1px solid var(--rule)',
            borderRadius: 10, padding: '14px 16px',
            borderTop: `3px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Grid cols={2} gap={16}>
        <Card title="Distribusi Piutang" sub={`Per akun · ${m[li] || ''}`}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={piuPie} cx="50%" cy="50%" outerRadius={82} innerRadius={44} dataKey="value" paddingAngle={2}>
                {piuPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => fmtFull(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 11 }} />
              <Legend iconSize={7} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tren Piutang" sub="Top 5 akun per bulan">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="mo" />
              <YAxis tickFormatter={fmt} width={48} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 11 }} formatter={v => fmtFull(v)} />
              <Legend iconSize={7} />
              {piuRows.slice(0, 5).map((p, i) => (
                <Line key={p.no} type="monotone" dataKey={p.label} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </Grid>

      <Card title="Detail Piutang per Akun COA" sub={`Saldo akhir periode · dibaca dari file Neraca`}>
        <DataTable
          headers={[
            { label: 'Nama Akun' },
            { label: 'No. COA' },
            { label: 'Saldo Akhir',   right: true },
            { label: '% Total',       right: true },
            { label: 'Rata-rata',     right: true },
            { label: 'Status' },
          ]}
          rows={[...piuRows].sort((a, b) => Math.abs(b.last) - Math.abs(a.last)).map(p => {
            const active = p.values.filter(v => v !== 0)
            const avg    = active.length ? active.reduce((s, v) => s + Math.abs(v), 0) / active.length : 0
            const good   = Math.abs(p.last) <= avg * 1.3
            return [
              { value: p.label, bold: true },
              { value: p.no, mono: true },
              { value: fmtFull(Math.abs(p.last)), mono: true, right: true },
              { value: totalPiu > 0 ? `${(Math.abs(p.last) / totalPiu * 100).toFixed(1)}%` : '—', mono: true, right: true },
              { value: fmtFull(avg), mono: true, right: true },
              { node: <Badge value={good ? 'Normal' : 'Naik'} good={good} /> },
            ]
          })}
        />
      </Card>
    </div>
  )
}