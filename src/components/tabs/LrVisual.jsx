import { useMemo } from 'react'
import {
  ComposedChart, Area, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ACCT, totalOf } from '../../lib/parser'
import { fmtFull } from '../../lib/format'

/* ─── colour tokens ─────────────────────────────────────────── */
const C = {
  lime:   '#8DC900',
  pos:    '#1A6B00',
  neg:    '#CC2200',
  warn:   '#B87800',
  ink:    '#0D0D0B',
  ink2:   '#2A2925',
  ink3:   '#58564F',
  ink4:   '#9C9A92',
  rule2:  '#B8B6AF',
  bg:     '#DCDAD5',
  panel:  '#F0EEE9',
  surface:'#E8E6E1',
  mkt:    '#6366F1',
  kary:   '#0EA5E9',
  gedung: '#F59E0B',
  umum:   '#8B5CF6',
  opsln:  '#EC4899',
}
const F = "Arial, sans-serif"

// Navision sign convention:
//   pendapatan = kredit (negatif) → laba kotor = negatif = UNTUNG
//   biaya      = debit  (positif) → tapi kadang kredit (negatif) jika ada reversal
//   laba bersih akun 89x: negatif = UNTUNG, positif = RUGI
//
// Untuk display "user-friendly" (untung=positif):
//   rev display   = -raw  (flip)
//   laba display  = -raw  (flip)
//   biaya display = raw   (tampil as-is, positif = beban, negatif = kredit/reversal)
//
// clrDisplay: warna berdasarkan makna ekonomi
//   pendapatan/laba → positif display = hijau
//   biaya           → positif display = merah (beban), negatif = hijau (reversal/kredit)

const abbr = v => {
  const a = Math.abs(v)
  if (a >= 1e9) return (v/1e9).toFixed(1)+'M'
  if (a >= 1e6) return (v/1e6).toFixed(1)+'jt'
  if (a >= 1e3) return (v/1e3).toFixed(0)+'k'
  return String(Math.round(v))
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:C.ink, border:`1px solid ${C.ink3}`, padding:'10px 14px',
      fontFamily:F, fontSize:12, boxShadow:'4px 4px 0 rgba(0,0,0,.4)' }}>
      <div style={{ color:C.ink4, marginBottom:6, fontSize:11 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:24,
          color:p.color||'#fff', marginBottom:2 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight:700 }}>{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Panel({ title, sub, children }) {
  return (
    <div style={{ background:C.panel, border:`1px solid ${C.rule2}`, borderLeft:`3px solid ${C.lime}` }}>
      <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.rule2}`, background:C.surface,
        display:'flex', alignItems:'baseline', gap:10 }}>
        <span style={{ fontFamily:F, fontSize:12, fontWeight:700, color:C.ink }}>{title}</span>
        {sub && <span style={{ fontFamily:F, fontSize:12, color:C.ink4 }}>{sub}</span>}
      </div>
      <div style={{ padding:'16px' }}>{children}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════ */
export default function LrVisual({ data, months }) {
  const rows      = data?.rows    || {}
  const allMonths = data?.months  || []

  // ── Raw values dari Navision (SAMA PERSIS dengan Income Bridge) ──
  const raw = no => totalOf(rows, no)

  const vRev      = raw(ACCT.PENDAPATAN)    // negatif = pendapatan (kredit)
  const vHPP      = raw(ACCT.HPP)           // positif = beban (debit)
  const vMkt      = raw(ACCT.BIAYA_MKT)
  const vKary     = raw(ACCT.BIAYA_KARY)
  const vGedung   = raw(ACCT.BIAYA_GEDUNG)
  const vUmum     = raw(ACCT.BIAYA_UMUM)
  const vOpsLn    = raw(ACCT.BIAYA_OPS_LN)
  const vSlKurs   = raw(ACCT.SELISIH_KURS)
  const vSlAT     = raw(ACCT.SELISIH_AT)
  const vAdmBank  = raw(ACCT.ADM_BANK)
  const vPendLain = raw(ACCT.PEND_LAIN)
  const vBiayLain = raw(ACCT.BIAYA_LAIN)
  const vPosLuar  = raw('69999999')
  const vPajak    = raw('80999999')
  const vLabaBersih = raw(ACCT.LABA_BERSIH) // negatif = untung

  // ── Derived (raw, TANPA flip) — persis Income Bridge ──
  const vLabaKotor     = vRev + vHPP
  const vLabaOps       = vLabaKotor + vMkt + vKary + vGedung + vUmum + vOpsLn
  const vLabaSblmPajak = vLabaBersih + vPajak   // 89x + 80x

  const hasLuar = vSlKurs !== 0 || vSlAT !== 0 || vAdmBank !== 0 ||
                  vPendLain !== 0 || vBiayLain !== 0

  // ── Untuk display chart: flip pendapatan & laba supaya positif = untung ──
  const dRev    = -vRev
  const dLaba   = -vLabaBersih
  const dOpex   = Math.abs(vMkt) + Math.abs(vKary) + Math.abs(vGedung) +
                  Math.abs(vUmum) + Math.abs(vOpsLn)  // total beban absolut untuk chart

  // ── Untuk % margin: pakai rev absolut sebagai denominator ──
  const revAbs  = Math.abs(vRev) || 1
  const pct     = (v) => (v / revAbs * 100).toFixed(1) + '%'

  // ── Warna berdasarkan nilai raw:
  //    pendapatan/laba: negatif raw = untung = hijau
  //    biaya: positif raw = beban = merah, negatif = reversal = hijau
  //    total (laba kotor, ops, bersih): negatif = untung
  const clrLaba  = v => v <= 0 ? C.pos : C.neg   // untuk akun laba
  const clrBiaya = v => v >= 0 ? C.neg : C.pos   // untuk akun biaya (positif = beban)

  // ── Monthly trend — semua display-friendly (positif = baik) ──
  const trendData = useMemo(() => allMonths.map((m, i) => {
    const rev    = -(rows[ACCT.PENDAPATAN]?.[i]   ?? 0)   // flip → positif
    const hpp    =  Math.abs(rows[ACCT.HPP]?.[i]  ?? 0)
    const mkt    =  Math.abs(rows[ACCT.BIAYA_MKT]?.[i]    ?? 0)
    const kary   =  Math.abs(rows[ACCT.BIAYA_KARY]?.[i]   ?? 0)
    const gedung =  Math.abs(rows[ACCT.BIAYA_GEDUNG]?.[i] ?? 0)
    const umum   =  Math.abs(rows[ACCT.BIAYA_UMUM]?.[i]   ?? 0)
    const opsln  =  Math.abs(rows[ACCT.BIAYA_OPS_LN]?.[i] ?? 0)
    const beban  = hpp + mkt + kary + gedung + umum + opsln
    const laba   = -(rows[ACCT.LABA_BERSIH]?.[i]  ?? 0)   // flip → positif = untung
    const gm     = rev > 0 ? ((rev - hpp) / rev * 100) : null
    return {
      bulan:       m.length > 7 ? m.slice(0,7) : m,
      Pendapatan:  rev,
      Beban:       beban,
      Laba:        laba,
      GM:          gm,
    }
  }), [rows, allMonths])

  // ── Opex breakdown (pakai abs untuk komposisi) ──
  const opexItems = [
    { name:'Marketing',   no:ACCT.BIAYA_MKT,    color:C.mkt    },
    { name:'Karyawan',    no:ACCT.BIAYA_KARY,   color:C.kary   },
    { name:'Gedung & Ops',no:ACCT.BIAYA_GEDUNG, color:C.gedung },
    { name:'Umum',        no:ACCT.BIAYA_UMUM,   color:C.umum   },
    { name:'Ops Lainnya', no:ACCT.BIAYA_OPS_LN, color:C.opsln  },
  ]
  const opexData = useMemo(() => {
    const tot = opexItems.reduce((s,it) => s + Math.abs(raw(it.no)), 0) || 1
    return opexItems
      .map(it => ({ ...it, val: Math.abs(raw(it.no)), pct: Math.abs(raw(it.no))/tot*100 }))
      .filter(it => it.val > 0)
      .sort((a,b) => b.val - a.val)
  }, [rows])

  // ── Summary rows: val = raw Navision, warna pakai clrLaba/clrBiaya ──
  const summaryRows = [
    { label:'Pendapatan Bersih',       val: vRev,         clr: clrLaba(vRev),         pct: pct(dRev),                 bold:false },
    { label:'Harga Pokok Penjualan',   val: vHPP,         clr: clrBiaya(vHPP),        pct: pct(Math.abs(vHPP)),       bold:false, indent:true },
    { label:'Laba Kotor',              val: vLabaKotor,   clr: clrLaba(vLabaKotor),   pct: pct(-vLabaKotor),          bold:true  },
    { label:'Total Biaya Operasional', val: null,         clr: C.warn,                pct: pct(dOpex),                bold:false, indent:true, isHdr:true,
      hdrVal: dOpex },
    { label:'└ Marketing',             val: vMkt,         clr: clrBiaya(vMkt),        pct: pct(Math.abs(vMkt)),       bold:false, indent2:true },
    { label:'└ Karyawan',              val: vKary,        clr: clrBiaya(vKary),       pct: pct(Math.abs(vKary)),      bold:false, indent2:true },
    { label:'└ Gedung & Ops',          val: vGedung,      clr: clrBiaya(vGedung),     pct: pct(Math.abs(vGedung)),    bold:false, indent2:true },
    { label:'└ Umum',                  val: vUmum,        clr: clrBiaya(vUmum),       pct: pct(Math.abs(vUmum)),      bold:false, indent2:true },
    ...(vOpsLn !== 0 ? [
      { label:'└ Ops Lainnya',         val: vOpsLn,       clr: clrBiaya(vOpsLn),      pct: pct(Math.abs(vOpsLn)),     bold:false, indent2:true }
    ] : []),
    { label:'Laba Operasional',        val: vLabaOps,     clr: clrLaba(vLabaOps),     pct: pct(-vLabaOps),            bold:true  },
    ...(hasLuar ? [
      { label:'Pos Luar Usaha',        val: null,         clr: C.ink3,                pct:'',                         bold:false, indent:true, isGrpHdr:true },
      ...(vSlKurs   !== 0 ? [{ label:'└ Selisih Kurs',      val:vSlKurs,   clr:clrBiaya(vSlKurs),   pct:'', bold:false, indent2:true }] : []),
      ...(vSlAT     !== 0 ? [{ label:'└ Selisih Aktiva',    val:vSlAT,     clr:clrBiaya(vSlAT),     pct:'', bold:false, indent2:true }] : []),
      ...(vAdmBank  !== 0 ? [{ label:'└ Administrasi Bank', val:vAdmBank,  clr:clrBiaya(vAdmBank),  pct:'', bold:false, indent2:true }] : []),
      ...(vPendLain !== 0 ? [{ label:'└ Pendapatan Lain',   val:vPendLain, clr:clrLaba(vPendLain),  pct:'', bold:false, indent2:true }] : []),
      ...(vBiayLain !== 0 ? [{ label:'└ Biaya Lain',        val:vBiayLain, clr:clrBiaya(vBiayLain), pct:'', bold:false, indent2:true }] : []),
      { label:'Pos Luar Usaha, Total', val:vPosLuar,      clr:clrLaba(vPosLuar),      pct:'',                         bold:true  },
    ] : []),
    { label:'Laba Sblm Pajak',         val: vLabaSblmPajak, clr:clrLaba(vLabaSblmPajak), pct:pct(-vLabaSblmPajak),   bold:true  },
    ...(vPajak !== 0 ? [
      { label:'Pajak Penghasilan',     val: vPajak,       clr: clrBiaya(vPajak),      pct: pct(Math.abs(vPajak)),     bold:false, indent:true }
    ] : []),
    { label:'Laba Bersih',             val: vLabaBersih,  clr: clrLaba(vLabaBersih),  pct: pct(dLaba),                bold:true, final:true },
  ]

  if (vRev === 0 && vLabaBersih === 0) return (
    <div style={{ padding:32, fontFamily:F, fontSize:12, color:C.ink4, textAlign:'center' }}>
      Tidak ada data L/R
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* ── Tren Bulanan ── */}
      {trendData.length > 1 && (
        <Panel title="Tren Bulanan" sub={`${trendData.length} bulan`}>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={trendData} margin={{ top:8, right:56, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.lime} stopOpacity={0.25}/>
                  <stop offset="100%" stopColor={C.lime} stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="gradBeban" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={C.warn} stopOpacity={0.3}/>
                  <stop offset="100%" stopColor={C.warn} stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={C.rule2} strokeDasharray="3 4"/>
              <XAxis dataKey="bulan"
                tick={{ fontFamily:F, fontSize:11, fill:C.ink4 }}
                axisLine={false} tickLine={false}/>
              {/* Left axis — nilai rupiah */}
              <YAxis yAxisId="rp" tickFormatter={abbr}
                tick={{ fontFamily:F, fontSize:11, fill:C.ink4 }}
                axisLine={false} tickLine={false} width={56}/>
              {/* Right axis — GM % */}
              <YAxis yAxisId="pct" orientation="right"
                tickFormatter={v => v.toFixed(0)+'%'}
                tick={{ fontFamily:F, fontSize:11, fill:C.ink4 }}
                axisLine={false} tickLine={false} width={40}
                domain={['auto','auto']}/>
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div style={{ background:C.ink, border:`1px solid ${C.ink3}`,
                      padding:'10px 14px', fontFamily:F, fontSize:12,
                      boxShadow:'4px 4px 0 rgba(0,0,0,.4)' }}>
                      <div style={{ color:C.ink4, marginBottom:6, fontSize:11 }}>{label}</div>
                      {payload.map((p,i) => p.value != null && (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between',
                          gap:20, color:p.color||'#fff', marginBottom:2 }}>
                          <span>{p.name}</span>
                          <span style={{ fontWeight:700 }}>
                            {p.name === 'GM %'
                              ? p.value.toFixed(1)+'%'
                              : fmtFull(p.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <ReferenceLine yAxisId="rp" y={0} stroke={C.ink3} strokeWidth={1} strokeDasharray="4 3"/>
              {/* Areas */}
              <Area yAxisId="rp" type="monotone" dataKey="Pendapatan"
                stroke={C.lime} strokeWidth={2}
                fill="url(#gradRev)" dot={false} activeDot={{ r:4, fill:C.lime }}/>
              <Area yAxisId="rp" type="monotone" dataKey="Beban"
                name="Total Beban"
                stroke={C.warn} strokeWidth={2} strokeDasharray="5 3"
                fill="url(#gradBeban)" dot={false} activeDot={{ r:4, fill:C.warn }}/>
              {/* Laba line — tebal, dengan dots */}
              <Line yAxisId="rp" type="monotone" dataKey="Laba"
                name="Laba Bersih"
                stroke={C.pos} strokeWidth={2.5}
                dot={{ r:3, fill:C.pos, strokeWidth:0 }}
                activeDot={{ r:5, fill:C.pos }}/>
              {/* GM % line — right axis, tipis */}
              <Line yAxisId="pct" type="monotone" dataKey="GM"
                name="GM %"
                stroke={C.ink3} strokeWidth={1.5} strokeDasharray="3 3"
                dot={false} activeDot={{ r:3, fill:C.ink3 }}/>
            </ComposedChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display:'flex', gap:20, marginTop:6, justifyContent:'center', flexWrap:'wrap' }}>
            {[
              ['Pendapatan', C.lime,  'solid'],
              ['Total Beban', C.warn, 'dashed'],
              ['Laba Bersih', C.pos,  'solid'],
              ['GM %',        C.ink3, 'dotted'],
            ].map(([l,c,s])=>(
              <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <svg width={20} height={10}>
                  <line x1={0} y1={5} x2={20} y2={5}
                    stroke={c} strokeWidth={s==='dotted'?1.5:2}
                    strokeDasharray={s==='dashed'?'5 3':s==='dotted'?'3 3':'none'}/>
                  {s==='solid' && <circle cx={10} cy={5} r={3} fill={c}/>}
                </svg>
                <span style={{ fontFamily:F, fontSize:11, color:C.ink3 }}>{l}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Komposisi Opex + Ringkasan L/R ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>

        {/* Opex Breakdown */}
        <Panel title="Komposisi Biaya Operasional" sub={fmtFull(dOpex)}>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {opexData.map((it,i) => (
              <div key={it.name}>
                {i > 0 && <div style={{ height:1, background:C.rule2 }}/>}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0' }}>
                  <div style={{ width:3, alignSelf:'stretch', background:it.color, flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
                      <span style={{ fontFamily:F, fontSize:12, color:C.ink2 }}>{it.name}</span>
                      <span style={{ fontFamily:F, fontSize:12, fontWeight:700, color:it.color }}>{it.pct.toFixed(1)}%</span>
                    </div>
                    <div style={{ height:4, background:C.rule2 }}>
                      <div style={{ height:'100%', width:`${it.pct}%`, background:it.color }}/>
                    </div>
                    <div style={{ fontFamily:F, fontSize:11, color:C.ink4, marginTop:3 }}>{fmtFull(it.val)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Ringkasan L/R */}
        <Panel title="Ringkasan L/R" sub={`${months.length} bulan`}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.rule2}` }}>
                <th style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.ink4, textAlign:'left', paddingBottom:6, paddingRight:8 }}>Akun</th>
                <th style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.ink4, textAlign:'right', paddingBottom:6, width:140 }}>Nilai</th>
                <th style={{ fontFamily:F, fontSize:11, fontWeight:700, color:C.ink4, textAlign:'right', paddingBottom:6, width:56 }}>% Rev</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((r,i) => (
                <tr key={i} style={{
                  borderTop: r.final ? `2px solid ${C.ink}` : `1px solid ${C.rule2}`,
                  background: r.isGrpHdr ? C.bg : r.bold ? C.surface : 'transparent',
                }}>
                  <td style={{
                    fontFamily:F, fontSize:12,
                    fontWeight: r.bold ? 700 : 400,
                    color: r.bold ? C.ink : C.ink3,
                    padding: r.bold ? '7px 0 7px 4px' : '5px 0 5px 4px',
                    paddingLeft: r.indent2 ? 28 : r.indent ? 14 : 4,
                  }}>{r.label}</td>
                  <td style={{
                    fontFamily:F, fontSize:12,
                    fontWeight: r.bold ? 700 : 400,
                    color: r.clr,
                    textAlign:'right', padding:'5px 0',
                  }}>
                    {r.isHdr
                      ? <span style={{ color:C.warn }}>({fmtFull(r.hdrVal)})</span>
                      : r.isGrpHdr ? '' : fmtFull(r.val)
                    }
                  </td>
                  <td style={{ fontFamily:F, fontSize:11, color:C.ink4, textAlign:'right', padding:'5px 0' }}>
                    {r.pct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

      </div>
    </div>
  )
}