import { useMemo, useState } from 'react'
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { fmtFull } from '../../lib/format'
import { Card, Grid, Empty, ChartTip } from '../ui'

const F = 'Arial, sans-serif'

// ── Ekstrak akun Kas & Bank dari neracaData ──────────────────
// Prefix 1101xxxxx = Kas, 1102xxxxx = Bank
// Saldo tiap periode adalah balance at date (bukan net change)
// Delta saldo = arus kas periode bersangkutan
function extractKasBank(rawRows, months) {
  const len   = (months || []).length
  const empty = Array(len).fill(0)

  // Ambil semua akun kas (1101x) dan bank (1102x), bukan summary
  // Hanya akun dengan prefix COA 1101x (Kas) dan 1102x (Bank) — tidak pakai fallback nama
  // agar akun seperti "Hutang Bank", "Intercompany" tidak ikut masuk
  const kasAccounts  = rawRows.filter(r =>
    r.no &&
    r.no.startsWith('1101') &&
    !r.no.endsWith('999999') && !r.no.endsWith('99999') &&
    !/TOTAL/i.test(r.name || '')
  )
  const bankAccounts = rawRows.filter(r =>
    r.no &&
    r.no.startsWith('1102') &&
    !r.no.endsWith('999999') && !r.no.endsWith('99999') &&
    !/TOTAL/i.test(r.name || '')
  )

  // Hitung delta saldo per periode untuk setiap akun
  // delta[i] = saldo[i] - saldo[i-1]  (saldo[0] = nilai bulan pertama itu sendiri)
  const delta = (accounts) => {
    if (!accounts.length) return empty
    const sum = Array(len).fill(0)
    accounts.forEach(r => {
      (r.values || []).forEach((v, i) => {
        const prev = i > 0 ? (r.values[i - 1] || 0) : 0
        sum[i] += (v || 0) - prev
      })
    })
    return sum
  }

  // Saldo total Kas & Bank per periode (untuk area chart)
  const saldoKas  = Array(len).fill(0)
  const saldoBank = Array(len).fill(0);
  [...kasAccounts, ...bankAccounts].forEach(r => {
    (r.values || []).forEach((v, i) => {
      if (kasAccounts.includes(r))  saldoKas[i]  += (v || 0)
      else                           saldoBank[i] += (v || 0)
    })
  })

  return {
    kasAccounts,
    bankAccounts,
    deltaKas:   delta(kasAccounts),
    deltaBank:  delta(bankAccounts),
    saldoKas,
    saldoBank,
    saldoTotal: saldoKas.map((v, i) => v + saldoBank[i]),
  }
}

// ── Modal detail akun ────────────────────────────────────────
function DetailModal({ label, color, accounts, months, isDelta, onClose }) {
  const totals = accounts.map(a => {
    const vals = isDelta
      ? (a.values || []).map((v, i) => (v || 0) - (i > 0 ? (a.values[i-1] || 0) : 0))
      : (a.values || [])
    return { ...a, displayVals: vals, total: vals.reduce((s, v) => s + v, 0) }
  })
  const grandTotal = totals.reduce((s, a) => s + a.total, 0)

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(26,25,22,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card)', borderRadius: 14,
        width: '100%', maxWidth: 940, maxHeight: '82vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', fontFamily: F }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: F }}>
              {accounts.length} akun · Total {fmtFull(grandTotal)}
            </span>
            {isDelta && (
              <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: F, padding: '2px 7px', background: 'var(--raised)', borderRadius: 99, border: '1px solid var(--rule)' }}>
                Δ perubahan saldo
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%', border: 'none',
            background: 'var(--raised)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F, fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <tr>
                <th style={thS()}>Nama Akun</th>
                <th style={thS()}>No. COA</th>
                {(months || []).map(mo => <th key={mo} style={thS(true)}>{mo}</th>)}
                <th style={thS(true)}>Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((a, ri) => (
                <tr key={a.no || ri} style={{ background: ri % 2 === 0 ? 'var(--card)' : 'var(--surface)' }}>
                  <td style={tdS()}>{a.name || a.no}</td>
                  <td style={{ ...tdS(), color: 'var(--t4)', fontSize: 11 }}>{a.no}</td>
                  {a.displayVals.map((v, i) => (
                    <td key={i} style={{ ...tdS(true), color: v > 0 ? 'var(--pos)' : v < 0 ? 'var(--neg)' : 'var(--t4)' }}>
                      {fmtFull(v)}
                    </td>
                  ))}
                  <td style={{ ...tdS(true), fontWeight: 700, color: a.total > 0 ? 'var(--pos)' : a.total < 0 ? 'var(--neg)' : 'var(--t4)' }}>
                    {fmtFull(a.total)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'var(--raised)', borderTop: '2px solid var(--rule)' }}>
                <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--t1)', fontFamily: F, fontSize: 12 }}>
                  TOTAL
                </td>
                {(months || []).map((_, i) => {
                  const v = totals.reduce((s, a) => s + (a.displayVals[i] || 0), 0)
                  return <td key={i} style={{ ...tdS(true), fontWeight: 700, color: v > 0 ? 'var(--pos)' : v < 0 ? 'var(--neg)' : 'var(--t4)' }}>{fmtFull(v)}</td>
                })}
                <td style={{ ...tdS(true), fontWeight: 800, color: grandTotal > 0 ? 'var(--pos)' : grandTotal < 0 ? 'var(--neg)' : 'var(--t4)' }}>
                  {fmtFull(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const thS = (right) => ({
  padding: '9px 14px', fontFamily: F, fontSize: 9, fontWeight: 700,
  color: 'var(--t4)', letterSpacing: '.08em', textTransform: 'uppercase',
  textAlign: right ? 'right' : 'left',
  borderBottom: '2px solid var(--rule)', whiteSpace: 'nowrap',
})
const tdS = (right) => ({
  padding: '9px 14px', fontFamily: F, fontSize: 12,
  textAlign: right ? 'right' : 'left', color: 'var(--t2)',
  borderBottom: '1px solid var(--rule2)', whiteSpace: 'nowrap',
})

// Clickable row
function KasRow({ label, vals, total, months, color, isBold, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        background: hov ? 'var(--raised)' : isBold ? 'var(--surface)' : 'var(--card)',
        transition: 'background .1s',
      }}
    >
      <td style={{ padding: '10px 14px', fontFamily: F, fontSize: 12, fontWeight: isBold ? 800 : 600, color: 'var(--t1)', borderBottom: '1px solid var(--rule2)', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          {color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />}
          {label}
          {onClick && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: hov ? 1 : 0, transition: 'opacity .1s' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          )}
        </span>
      </td>
      {(months || []).map((_, i) => {
        const v = vals[i] || 0
        return (
          <td key={i} style={{
            padding: '10px 14px', fontFamily: F, fontSize: 12, textAlign: 'right',
            fontWeight: isBold ? 700 : 400, borderBottom: '1px solid var(--rule2)',
            color: v > 0 ? 'var(--pos)' : v < 0 ? 'var(--neg)' : 'var(--t4)',
          }}>
            {fmtFull(v)}
          </td>
        )
      })}
      <td style={{
        padding: '10px 14px', fontFamily: F, fontSize: 12, fontWeight: 700,
        textAlign: 'right', borderBottom: '1px solid var(--rule2)',
        color: total > 0 ? 'var(--pos)' : total < 0 ? 'var(--neg)' : 'var(--t4)',
      }}>
        {fmtFull(total)}
      </td>
    </tr>
  )
}

// ── Dropdown saldo per kelompok ──────────────────────────────
function SaldoGroup({ label, color, accounts, months, saldoPerBulan }) {
  const [open, setOpen] = useState(false)
  const lastIdx = (months?.length || 1) - 1
  const totalAkhir = saldoPerBulan[lastIdx] || 0

  return (
    <div style={{ borderBottom: '1px solid var(--rule2)' }}>
      {/* Header row — selalu tampil */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center',
          cursor: 'pointer', transition: 'background .1s',
          background: open ? 'var(--raised)' : 'var(--card)',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--raised)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'var(--card)' }}
      >
        {/* Label cell */}
        <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 180, flex: '0 0 180px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', fontFamily: F }}>{label}</span>
          <span style={{ fontSize: 10, color: 'var(--t4)', fontFamily: F }}>({accounts.length})</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ marginLeft: 2, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        {/* Nilai per bulan */}
        {(months || []).map((_, i) => (
          <div key={i} style={{ padding: '11px 14px', fontSize: 12, fontFamily: F, textAlign: 'right', flex: 1, color: 'var(--t2)' }}>
            {fmtFull(saldoPerBulan[i] || 0)}
          </div>
        ))}
        {/* Total akhir */}
        <div style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, fontFamily: F, textAlign: 'right', flex: '0 0 130px', color: 'var(--blue)' }}>
          {fmtFull(totalAkhir)}
        </div>
      </div>

      {/* Detail akun — hanya muncul saat open */}
      {open && accounts.map((a, ri) => (
        <div key={a.no || ri} style={{
          display: 'flex', alignItems: 'center',
          background: ri % 2 === 0 ? 'var(--surface)' : 'var(--card)',
          borderTop: '1px solid var(--rule2)',
        }}>
          <div style={{ padding: '8px 14px 8px 32px', display: 'flex', alignItems: 'center', gap: 6, minWidth: 180, flex: '0 0 180px' }}>
            <span style={{ color: 'var(--t4)', fontSize: 10 }}>└</span>
            <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: F }}>{a.name || a.no}</span>
          </div>
          {(months || []).map((_, i) => (
            <div key={i} style={{ padding: '8px 14px', fontSize: 11, fontFamily: F, textAlign: 'right', flex: 1, color: 'var(--t3)' }}>
              {fmtFull(a.values?.[i] || 0)}
            </div>
          ))}
          <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 600, fontFamily: F, textAlign: 'right', flex: '0 0 130px', color: 'var(--t2)' }}>
            {fmtFull(a.values?.[(months?.length || 1) - 1] || 0)}
          </div>
        </div>
      ))}
    </div>
  )
}

function SaldoDropdown({ kasAccounts, bankAccounts, saldoTotal, lastSaldo, months }) {
  // Hitung saldo per bulan per kelompok
  const saldoKasPerBulan  = (months || []).map((_, i) =>
    kasAccounts.reduce((s, a)  => s + (a.values?.[i] || 0), 0)
  )
  const saldoBankPerBulan = (months || []).map((_, i) =>
    bankAccounts.reduce((s, a) => s + (a.values?.[i] || 0), 0)
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Header tabel */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '2px solid var(--rule)' }}>
        <div style={{ padding: '9px 14px', minWidth: 180, flex: '0 0 180px', fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.08em', textTransform: 'uppercase', fontFamily: F }}>
          Kelompok
        </div>
        {(months || []).map(mo => (
          <div key={mo} style={{ padding: '9px 14px', flex: 1, fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'right', fontFamily: F, whiteSpace: 'nowrap' }}>
            {mo}
          </div>
        ))}
        <div style={{ padding: '9px 14px', flex: '0 0 130px', fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'right', fontFamily: F }}>
          Akhir Periode
        </div>
      </div>

      {kasAccounts.length > 0 && (
        <SaldoGroup label="Kas" color="var(--blue)" accounts={kasAccounts} months={months} saldoPerBulan={saldoKasPerBulan} />
      )}
      {bankAccounts.length > 0 && (
        <SaldoGroup label="Bank" color="var(--pos)" accounts={bankAccounts} months={months} saldoPerBulan={saldoBankPerBulan} />
      )}

      {/* Total row */}
      <div style={{ display: 'flex', background: 'var(--raised)', borderTop: '2px solid var(--rule)' }}>
        <div style={{ padding: '11px 14px', minWidth: 180, flex: '0 0 180px', fontSize: 12, fontWeight: 800, color: 'var(--t1)', fontFamily: F }}>
          TOTAL KAS + BANK
        </div>
        {(months || []).map((_, i) => (
          <div key={i} style={{ padding: '11px 14px', flex: 1, fontSize: 12, fontWeight: 700, textAlign: 'right', color: 'var(--t1)', fontFamily: F }}>
            {fmtFull(saldoTotal[i] || 0)}
          </div>
        ))}
        <div style={{ padding: '11px 14px', flex: '0 0 130px', fontSize: 13, fontWeight: 800, textAlign: 'right', color: 'var(--blue)', fontFamily: F }}>
          {fmtFull(lastSaldo)}
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function TabArusKas({ lrData, neracaData, months: m }) {
  const rawRows = neracaData?.rawRows || []
  const [modal, setModal] = useState(null)

  const { kasAccounts, bankAccounts, deltaKas, deltaBank, saldoTotal } = useMemo(
    () => extractKasBank(rawRows, m),
    [rawRows, m]
  )

  const isEmpty = kasAccounts.length === 0 && bankAccounts.length === 0

  const totKas  = deltaKas.reduce((s, v)  => s + v, 0)
  const totBank = deltaBank.reduce((s, v) => s + v, 0)
  const netDelta = deltaKas.map((v, i) => v + deltaBank[i])
  const totNet  = totKas + totBank

  const monthly = useMemo(() => (m || []).map((mo, i) => ({
    mo,
    'Δ Kas':  deltaKas[i]  || 0,
    'Δ Bank': deltaBank[i] || 0,
  })), [m, deltaKas, deltaBank])

  const saldoChart = useMemo(() => (m || []).map((mo, i) => ({
    mo, 'Saldo Kas + Bank': saldoTotal[i] || 0,
  })), [m, saldoTotal])

  const lastSaldo = saldoTotal[saldoTotal.length - 1] || 0
  const tipStyle  = { background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 8, fontSize: 11, fontFamily: F }

  if (!m?.length) return <Empty text="Data tidak tersedia" />
  if (isEmpty) return (
    <Empty text="Akun Kas (1101x) & Bank (1102x) tidak ditemukan di file Neraca." />
  )

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: 'Saldo Kas + Bank',   value: lastSaldo, color: 'var(--blue)',                           sub: `${m[m.length-1] || ''}` },
            { label: 'Perubahan Kas',       value: totKas,   color: totKas  >= 0 ? 'var(--pos)' : 'var(--neg)', sub: 'Total Δ saldo kas' },
            { label: 'Perubahan Bank',      value: totBank,  color: totBank >= 0 ? 'var(--pos)' : 'var(--neg)', sub: 'Total Δ saldo bank' },
            { label: 'Net Δ Kas & Bank',    value: totNet,   color: totNet  >= 0 ? 'var(--pos)' : 'var(--neg)', sub: 'Kas + Bank gabungan' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'var(--card)', border: '1px solid var(--rule)',
              borderRadius: 10, padding: '14px 16px', borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: F }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, letterSpacing: '-0.5px', fontFamily: F }}>{fmtFull(s.value)}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, fontFamily: F }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <Grid cols={2} gap={16}>
          {/* Bar: perubahan saldo per bulan */}
          <Card title="Perubahan Saldo Kas & Bank" sub="Δ saldo per bulan (dari file Neraca)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthly} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--rule2)" />
                <XAxis dataKey="mo" tick={{ fontSize: 10, fontFamily: F }} />
                <YAxis tickFormatter={fmtFull} width={80} tick={{ fontSize: 10, fontFamily: F }} />
                <Tooltip content={<ChartTip fmt={fmtFull} />} />
                <Legend iconSize={7} wrapperStyle={{ fontSize: 11, fontFamily: F }} />
                <Bar dataKey="Δ Kas"  fill="var(--blue)" radius={[2,2,0,0]} />
                <Bar dataKey="Δ Bank" fill="var(--pos)"  radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Area: posisi saldo total */}
          <Card title="Posisi Saldo Kas + Bank" sub="Saldo akhir periode berjalan">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={saldoChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="kasGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--blue)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--rule2)" />
                <XAxis dataKey="mo" tick={{ fontSize: 10, fontFamily: F }} />
                <YAxis tickFormatter={fmtFull} width={80} tick={{ fontSize: 10, fontFamily: F }} />
                <Tooltip contentStyle={tipStyle} formatter={v => fmtFull(v)} />
                <Area type="monotone" dataKey="Saldo Kas + Bank" stroke="var(--blue)" strokeWidth={2} fill="url(#kasGrad2)" dot={{ r: 2.5, fill: 'var(--blue)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Tabel — klik baris untuk detail */}
        <Card title="Perubahan Saldo per Bulan" sub="Klik baris Kas / Bank untuk lihat detail akun">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)' }}>
                  <th style={thS()}>Kelompok</th>
                  {(m || []).map(mo => <th key={mo} style={thS(true)}>{mo}</th>)}
                  <th style={thS(true)}>Total Δ</th>
                </tr>
              </thead>
              <tbody>
                <KasRow label="Δ Saldo Kas"   vals={deltaKas}  total={totKas}  months={m} color="var(--blue)"
                  onClick={kasAccounts.length ? () => setModal({ label: 'Detail Kas', color: 'var(--blue)', accounts: kasAccounts, isDelta: true }) : null} />
                <KasRow label="Δ Saldo Bank"  vals={deltaBank} total={totBank} months={m} color="var(--pos)"
                  onClick={bankAccounts.length ? () => setModal({ label: 'Detail Bank', color: 'var(--pos)', accounts: bankAccounts, isDelta: true }) : null} />
                <KasRow label="Net Δ Kas + Bank" vals={netDelta} total={totNet} months={m} isBold />
              </tbody>
            </table>
          </div>
        </Card>

        {/* Tabel saldo absolut — dropdown per kelompok */}
        <Card title="Saldo Kas & Bank per Bulan" sub="Klik baris untuk expand detail akun">
          <SaldoDropdown
            kasAccounts={kasAccounts}
            bankAccounts={bankAccounts}
            saldoTotal={saldoTotal}
            lastSaldo={lastSaldo}
            months={m}
          />
        </Card>
      </div>

      {modal && (
        <DetailModal
          label={modal.label} color={modal.color}
          accounts={modal.accounts} months={m}
          isDelta={modal.isDelta}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}