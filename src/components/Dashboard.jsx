import { useState, useMemo, useRef, useEffect } from 'react'
import { ACCT, totalOf, lastOf } from '../lib/parser'

// Format angka penuh dengan pemisah ribuan (tanpa singkatan)
const fmt = (val) => {
  if (val == null || isNaN(val)) return '—'
  const abs = Math.abs(val)
  const formatted = abs.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return val < 0 ? `-${formatted}` : formatted
}
import { css } from '../lib/dashboardCss'
import PeriodPicker            from './ui/PeriodPicker'
import KpiDrilldown            from './ui/KpiDrilldown'
import RatioPanel, { Section } from './ui/RatioPanel'
import VarianceSection         from './ui/VarianceSection'
import TabLabRugi              from './tabs/TabLabRugi'
import TabNeraca               from './tabs/TabNeraca'
import TabArusKas              from './tabs/TabArusKas'
import TabPiutang              from './tabs/TabPiutang'
import CoaDrilldown            from './ui/CoaDrilldown'
import { CoaContext }            from '../lib/CoaContext'

const TABS = [
  { id: 'lr',       label: 'Laba Rugi', needsNeraca: false },
  { id: 'neraca',   label: 'Neraca',    needsNeraca: true  },
  { id: 'ak',       label: 'Arus Kas',  needsNeraca: false },
  { id: 'piutang',  label: 'Piutang',   needsNeraca: false },
  { id: 'variance', label: 'Variance',  needsNeraca: false },
]

function filterRows(dataObj, activeMonths, allMonths) {
  if (!dataObj) return dataObj
  if (activeMonths.length === allMonths.length && activeMonths.every((m,i) => m===allMonths[i])) return dataObj
  const src = dataObj.months || allMonths
  const rows = {}
  Object.entries(dataObj.rows||{}).forEach(([acct,val]) => {
    if (Array.isArray(val)) {
      rows[acct] = activeMonths.map(m => { const i=src.indexOf(m); return i>=0?(val[i]??0):0 })
    } else if (val && typeof val==='object') {
      const fm={}; activeMonths.forEach(m => { if (val[m]!==undefined) fm[m]=val[m] }); rows[acct]=fm
    } else { rows[acct]=val }
  })
  const rawRows = (dataObj.rawRows || []).map(r => ({
    ...r,
    values: Array.isArray(r.values)
      ? activeMonths.map(m => { const i=src.indexOf(m); return i>=0?(r.values[i]??0):0 })
      : r.values,
  }))
  return { ...dataObj, rows, months: activeMonths, rawRows }
}

export default function Dashboard({ data, onReset }) {
  const [tab, setTab]                   = useState('lr')
  const [manualBudget, setManualBudget] = useState({ biaya:{}, target:{} })
  const [drilldown, setDrilldown]       = useState(null)
  const [coaDrilldown, setCoaDrilldown] = useState(null)
  const kpiRefs = useRef({})

  const allMonths  = useMemo(() => data?.lr?.months || [], [data])
  const hasNeraca  = !!(data?.neraca?.rawRows?.length)
  const [activeMonths, setActiveMonths] = useState(allMonths)
  useEffect(() => setActiveMonths(data?.lr?.months || []), [data])

  const filteredLr      = useMemo(() => filterRows(data?.lr,      activeMonths, allMonths), [data,activeMonths,allMonths])
  const filteredNeraca  = useMemo(() => filterRows(data?.neraca,  activeMonths, allMonths), [data,activeMonths,allMonths])
  const filteredAk      = useMemo(() => filterRows(data?.ak,      activeMonths, allMonths), [data,activeMonths,allMonths])
  const filteredPiutang = useMemo(() => filterRows(data?.piutang, activeMonths, allMonths), [data,activeMonths,allMonths])

  const kpi = useMemo(() => {
    const lr  = filteredLr?.rows    || {}
    const nrc = filteredNeraca?.rows || {}
    const bdg = filterRows(data?.budget, activeMonths, allMonths)?.rows || {}
    const rev   = Math.abs(totalOf(lr, ACCT.PENDAPATAN))
    const hpp   = Math.abs(totalOf(lr, ACCT.HPP))
    const laba  = -totalOf(lr, ACCT.LABA_BERSIH)
    const bRev  = Math.abs(totalOf(bdg, ACCT.PENDAPATAN))
    const bruto = rev - hpp
    const aset  = lastOf(nrc, ACCT.TOTAL_AKTIVA)
    const safe  = (n, d) => (d !== 0 && isFinite(n) && isFinite(d)) ? n / d * 100 : null
    const gm    = safe(bruto, rev)
    const nm    = safe(laba,  rev)
    const varPct = bRev > 0 ? (rev - bRev) / bRev * 100 : null
    // Biaya = debit (positif di Navision). Jangan Math.abs per item —
    // jika ada akun kredit (refund), Math.abs akan dobel angkanya.
    // Gunakan raw sum, baru abs total, sama persis dengan TabLabRugi.
    const rawOpex =
      totalOf(lr, ACCT.BIAYA_MKT)
      + totalOf(lr, ACCT.BIAYA_KARY)
      + totalOf(lr, ACCT.BIAYA_GEDUNG)
      + totalOf(lr, ACCT.BIAYA_UMUM)
      + totalOf(lr, ACCT.BIAYA_OPS_LN)
    const opex    = Math.abs(rawOpex)
    const labaOps = bruto - opex
    // Non-ops: sign sudah mixed di Navision (selisih kurs bisa kredit/debit).
    // Jumlahkan raw persis seperti TabLabRugi — tidak perlu manual abs/kurang.
    const netNonOp =
      totalOf(lr, '61999999')
      + totalOf(lr, '63999999')
      + totalOf(lr, '64999999')
      + totalOf(lr, '65199999')
      + totalOf(lr, '65299999')
    const beban75k = Math.abs(totalOf(lr, '75555555'))
    const labaSblmPajak = beban75k > 0 ? (bruto - beban75k) : (labaOps + netNonOp)
    const pajak = Math.abs(totalOf(lr, ACCT.PAJAK || '80999999'))
    return { rev, laba, gm, nm, aset, varPct, bruto, hpp, opex, labaOps, labaSblmPajak, pajak }
  }, [filteredLr, filteredNeraca, data, activeMonths, allMonths])

  const period = activeMonths.length===0 ? '—'
    : activeMonths.length===1 ? activeMonths[0]
    : `${activeMonths[0]} – ${activeMonths[activeMonths.length-1]}`

  // badge: delta vs prev period atau persen dari target
  const kpis = [
    {
      key:'pendapatan', label:'Pendapatan Bersih',
      value: fmt(kpi.rev),
      sub:   `${activeMonths.length} bulan dipilih`,
      color: 'var(--lime)',
      // gauge: HPP/Rev sebagai cost ratio (lower=better)
      gauge: kpi.rev > 0 ? Math.round((kpi.hpp / kpi.rev) * 100) : null,
      gaugeLabel: 'HPP ratio',
      gaugeColor: 'var(--warn)',
      badge: null,
    },
    {
      key:'laba', label:'Laba Bersih',
      value: fmt(kpi.laba),
      sub:   `Net Margin: ${(kpi.nm??0).toFixed(1)}%`,
      color: kpi.laba >= 0 ? 'var(--pos)' : 'var(--neg)',
      gauge: kpi.nm != null ? Math.min(Math.max(Math.round(kpi.nm), -100), 100) : null,
      gaugeLabel: 'Net Margin',
      gaugeColor: kpi.laba >= 0 ? 'var(--pos)' : 'var(--neg)',
      badge: kpi.nm != null
        ? { text: `NM ${kpi.nm.toFixed(1)}%`, type: kpi.nm >= 0 ? 'pos' : 'neg' }
        : null,
    },
    {
      key:'gm', label:'Gross Margin',
      value: `${(kpi.gm??0).toFixed(1)}%`,
      sub:   `Laba Kotor: ${fmt(kpi.bruto)}`,
      color: kpi.gm == null ? 'var(--t4)' : kpi.gm >= 30 ? 'var(--pos)' : kpi.gm >= 0 ? 'var(--warn)' : 'var(--neg)',
      gauge: kpi.gm != null ? Math.min(Math.round(Math.abs(kpi.gm)), 100) : null,
      gaugeLabel: '% dari rev',
      gaugeColor: kpi.gm == null ? 'var(--t4)' : kpi.gm >= 30 ? 'var(--pos)' : kpi.gm >= 0 ? 'var(--warn)' : 'var(--neg)',
      badge: kpi.gm != null
        ? { text: kpi.gm >= 30 ? 'Baik' : kpi.gm >= 0 ? 'Cukup' : 'Rugi', type: kpi.gm >= 30 ? 'pos' : kpi.gm >= 0 ? 'neu' : 'neg' }
        : null,
    },
    {
      key:'aktiva', label:'Total Aktiva',
      value: fmt(kpi.aset),
      sub:   'Saldo akhir periode',
      color: 'var(--blue)',
      gauge: null,
      badge: null,
    },
    {
      key:'budget', label:'vs Budget',
      value: kpi.varPct != null ? `${kpi.varPct >= 0 ? '+' : ''}${kpi.varPct.toFixed(1)}%` : '—',
      sub:   kpi.varPct != null ? (kpi.varPct >= 0 ? 'Di atas target' : 'Di bawah target') : 'Belum ada budget',
      color: kpi.varPct == null ? 'var(--t4)' : kpi.varPct >= 0 ? 'var(--pos)' : 'var(--neg)',
      gauge: null,
      badge: kpi.varPct != null
        ? { text: kpi.varPct >= 0 ? '↑ Target' : '↓ Target', type: kpi.varPct >= 0 ? 'pos' : 'neg' }
        : null,
    },
  ]

  const budgetRowsForDrilldown = useMemo(() => filterRows(data?.budget, activeMonths, allMonths), [data, activeMonths, allMonths])

  const F = "Arial, sans-serif"
  const S = "Arial, sans-serif"

  return (
    <CoaContext.Provider value={{ openCoa: setCoaDrilldown, lrData: filteredLr }}>
      <style>{css}</style>
      <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column'}}>

        {/* ══ TOPBAR ══════════════════════════════════ */}
        <header style={{
          height:56, background:'var(--surface)',
          borderBottom:'1px solid var(--rule)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'0 28px', position:'sticky', top:0, zIndex:50, flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            {/* Logo mark */}
            <div className="topbar-logo-mark">
              <span style={{fontFamily:S,fontSize:13,fontWeight:700,color:'var(--card)',letterSpacing:'-0.5px'}}>F</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:1}}>
              <span style={{fontFamily:S,fontWeight:700,fontSize:15,color:'var(--t1)',letterSpacing:'-0.3px',lineHeight:1}}>IVP FIN 30</span>
              <span style={{fontFamily:F,fontSize:10,color:'var(--t4)',letterSpacing:'.06em',textTransform:'uppercase',lineHeight:1}}>Financial Dashboard</span>
            </div>
            <div style={{width:1,height:20,background:'var(--rule)',margin:'0 4px'}}/>
            <span style={{fontFamily:F,fontSize:12,color:'var(--t3)',display:'flex',alignItems:'center'}}>
              <span className="period-dot"/>{period}
            </span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <PeriodPicker allMonths={allMonths} activeMonths={activeMonths} onChange={setActiveMonths}/>
            <button className="top-btn" onClick={onReset}>
              <span style={{fontSize:11}}>↑</span> Upload Ulang
            </button>
          </div>
        </header>

        {/* ══ KPI GRID ═══════════════════════════════════ */}
        <div style={{
          background:'var(--surface)', borderBottom:'1px solid var(--rule)',
          position:'relative', zIndex:40,
          borderTop:'1px solid var(--rule)',
        }}>
          <div className="kpi-grid">
            {kpis.map((k,i) => {
              const isOpen = drilldown?.key === k.key
              // SVG gauge ring
              const gaugeEl = k.gauge != null ? (() => {
                const r = 22, cx = 26, cy = 26
                const circ = 2 * Math.PI * r
                const pct  = Math.min(Math.abs(k.gauge), 100) / 100
                const dash = circ * pct
                return (
                  <div className="kpi-card__gauge">
                    <svg viewBox="0 0 52 52">
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rule2)" strokeWidth="4"/>
                      <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke={k.gaugeColor} strokeWidth="4"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeLinecap="round"
                        style={{transition:'stroke-dasharray .5s ease'}}
                      />
                    </svg>
                    <div style={{
                      position:'absolute', inset:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontFamily:F, fontSize:10, fontWeight:700,
                      color:k.gaugeColor,
                    }}>{k.gauge}%</div>
                  </div>
                )
              })() : null

              return (
                <div key={i}
                  ref={el => kpiRefs.current[k.key] = el}
                  className={`kpi-card${isOpen?' kpi-card--open':''}`}
                  style={{'--kpi-color': k.color, paddingRight: k.gauge != null ? '76px' : '20px'}}
                  onClick={e => { e.stopPropagation(); setDrilldown(isOpen?null:{key:k.key,el:kpiRefs.current[k.key]}) }}
                >
                  <div className="kpi-card__label">{k.label}</div>
                  <div className="kpi-card__value">{k.value}</div>
                  <div className="kpi-card__row">
                    <div className="kpi-card__sub">{k.sub}</div>
                    {k.badge && (
                      <div className={`kpi-card__badge kpi-card__badge--${k.badge.type}`}>
                        {k.badge.text}
                      </div>
                    )}
                  </div>
                  {gaugeEl}
                </div>
              )
            })}
          </div>

          {drilldown && (
            <KpiDrilldown
              kpiKey={drilldown.key} kpi={kpi}
              lrData={filteredLr} budgetData={budgetRowsForDrilldown}
              anchorEl={drilldown.el} onClose={() => setDrilldown(null)}
            />
          )}
        </div>

        {/* ══ TAB BAR ══════════════════════════════════ */}
        <div style={{
          background:'var(--surface)', borderBottom:'1px solid var(--rule)',
          display:'flex', alignItems:'center', padding:'0 28px', gap:4,
        }}>
          {TABS.map(t => {
            const dis = t.needsNeraca && !hasNeraca
            return (
              <button key={t.id}
                className={`tab-btn${tab===t.id?' active':''}${dis?' tab-btn--disabled':''}`}
                onClick={() => !dis && setTab(t.id)}
                title={dis ? 'Upload file Neraca untuk mengaktifkan tab ini' : undefined}
              >
                {t.label}
                {dis && <span style={{marginLeft:4,fontSize:9,opacity:.6}}>✕</span>}
              </button>
            )
          })}
          {/* right side: period label */}
          <div style={{marginLeft:'auto',fontFamily:F,fontSize:10,color:'var(--t4)',letterSpacing:'.06em',textTransform:'uppercase',paddingRight:4}}>
            {activeMonths.length} bulan dipilih
          </div>
        </div>

        {/* ══ TAB CONTENT ══════════════════════════════ */}
        <div style={{flex:1,padding:'24px 28px 80px',overflow:'auto',display:'flex',flexDirection:'column',gap:'16px'}}>

          {tab==='lr' && <>
            <RatioPanel lrData={filteredLr} neracaData={filteredNeraca} months={activeMonths} hasNeraca={hasNeraca}/>
            <Section title="Laporan Laba Rugi" dot="var(--blue)" defaultOpen={true} noPad={true}>
              <TabLabRugi data={filteredLr} months={activeMonths}/>
            </Section>
          </>}

          {tab==='neraca' && (
            <Section title="Neraca" dot="var(--purple)" defaultOpen={true} noPad={true}>
              <TabNeraca data={filteredNeraca} months={activeMonths}/>
            </Section>
          )}

          {tab==='ak' && (
            <Section title="Arus Kas" dot="#0EA5E9" defaultOpen={true} noPad={true}>
              <TabArusKas data={filteredLr} months={activeMonths}/>
            </Section>
          )}

          {tab==='piutang' && (
            <Section title="Piutang" dot="var(--warn)" defaultOpen={true} noPad={true}>
              <TabPiutang data={filteredNeraca} months={activeMonths}/>
            </Section>
          )}

          {tab==='variance' && (
            <Section title="Variance & Budget" dot="var(--neg)" defaultOpen={true} noPad={true}>
              <div style={{padding:'20px 24px'}}>
                <VarianceSection
                  allMonths={allMonths} activeMonths={activeMonths}
                  manualBudget={manualBudget} setManualBudget={setManualBudget}
                  filteredLr={filteredLr}
                />
              </div>
            </Section>
          )}

        </div>
      </div>

      {coaDrilldown && (
        <CoaDrilldown subject={coaDrilldown} lrData={filteredLr} onClose={() => setCoaDrilldown(null)}/>
      )}
    </CoaContext.Provider>
  )
}