import { useMemo } from 'react'
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { ACCT, totalOf } from '../../lib/parser'
import { fmt, fmtFull, sign } from '../../lib/format'
import { Card, Grid, Empty, DataTable, Badge } from '../ui'

export default function TabVariance({ lrData, budgetData, months: m }) {
  const lr  = lrData?.rows   || {}
  const bdg = budgetData?.rows || {}

  const hasBudget = ACCT.VAR_ACCOUNTS.some(a => totalOf(bdg, a.no) !== 0)

  const rows = useMemo(() =>
    ACCT.VAR_ACCOUNTS.map(a => ({
      ...a,
      real:   totalOf(lr,  a.no),
      budget: totalOf(bdg, a.no),
      diff:   totalOf(lr,  a.no) - totalOf(bdg, a.no),
    })).filter(a => a.real !== 0 || a.budget !== 0),
  [lr, bdg])

  const chartData = rows.map(r => ({
    name:       r.label.replace('Biaya ', '').replace('Harga Pokok Penjualan', 'HPP'),
    Budget:     r.budget,
    Realisasi:  r.real,
    isGood:     r.isRev ? r.diff >= 0 : r.diff <= 0,
  }))

  if (!m?.length) return <Empty text="Data tidak tersedia" />

  if (!hasBudget) return (
    <Card title="Budget Belum Diisi" sub="Variance Analysis">
      <div style={{ textAlign: 'center', padding: '52px 0' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t4)', lineHeight: 2 }}>
          File Budget kosong atau belum diupload.<br />
          Isi sheet <strong style={{ color: 'var(--t2)' }}>Budget</strong> di template Excel lalu upload ulang.
        </div>
      </div>
    </Card>
  )

  const totalVar   = rows.find(r => r.no === ACCT.PENDAPATAN)
  const labaVar    = rows.find(r => r.no === ACCT.LABA_BERSIH)
  const revVarPct  = totalVar?.budget > 0 ? totalVar.diff / totalVar.budget * 100 : null
  const labaVarPct = labaVar?.budget  > 0 ? labaVar.diff  / labaVar.budget  * 100 : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Realisasi Pendapatan', value: fmtFull(totalVar?.real), accent: 'var(--blue)' },
          { label: 'Budget Pendapatan',    value: fmtFull(totalVar?.budget), accent: 'var(--t3)' },
          { label: 'Variance Pendapatan',
            value: revVarPct != null ? `${sign(revVarPct)}${revVarPct.toFixed(1)}%` : '—',
            accent: revVarPct == null ? 'var(--t4)' : revVarPct >= 0 ? 'var(--pos)' : 'var(--neg)' },
          { label: 'Variance Laba Bersih',
            value: labaVarPct != null ? `${sign(labaVarPct)}${labaVarPct.toFixed(1)}%` : '—',
            accent: labaVarPct == null ? 'var(--t4)' : labaVarPct >= 0 ? 'var(--pos)' : 'var(--neg)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--canvas)', border: '1px solid var(--line)',
            borderRadius: 'var(--r3)', padding: '14px 16px', boxShadow: 'var(--s1)',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: s.accent, fontWeight: 300, letterSpacing: '-0.5px' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card title="Budget vs Realisasi" sub="Per Akun COA · Total Kumulatif">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={fmt} width={52} />
            <Tooltip contentStyle={{ background: 'var(--canvas)', border: '1px solid var(--line2)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 10 }} formatter={v => fmtFull(v)} />
            <Legend iconSize={7} />
            <Bar dataKey="Budget"    fill="var(--sunken)" stroke="var(--line2)" strokeWidth={1} radius={[2,2,0,0]} />
            <Bar dataKey="Realisasi" radius={[2,2,0,0]}>
              {chartData.map((d, i) => <Cell key={i} fill={d.isGood ? 'var(--c2)' : 'var(--c3)'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Detail Variance" sub="No. Akun COA Matched">
        <DataTable
          headers={[
            { label: 'Akun' },
            { label: 'No. COA' },
            { label: 'Budget',    right: true },
            { label: 'Realisasi', right: true },
            { label: 'Selisih',   right: true },
            { label: '%',         right: true },
            { label: 'Status' },
          ]}
          rows={rows.map(r => {
            const pct  = r.budget !== 0 ? r.diff / Math.abs(r.budget) * 100 : null
            const good = r.isRev ? r.diff >= 0 : r.diff <= 0
            return [
              { value: r.label, bold: true },
              { value: r.no,    mono: true },
              { value: fmtFull(r.budget), mono: true, right: true },
              { value: fmtFull(r.real),   mono: true, right: true },
              { node: <Badge value={`${sign(r.diff)}${fmt(r.diff)}`} good={good} />, right: true },
              { node: <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: good ? 'var(--pos)' : 'var(--neg)' }}>{pct != null ? `${sign(r.diff)}${pct.toFixed(1)}%` : '—'}</span>, right: true },
              { node: <Badge value={good ? 'On Track' : 'Off Track'} good={good} /> },
            ]
          })}
        />
      </Card>
    </div>
  )
}
