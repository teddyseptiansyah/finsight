import { useState, useMemo, useRef, useEffect } from 'react'
import { ACCT, totalOf, lastOf } from '../lib/parser'
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
import { CoaContext }          from '../lib/CoaContext'

const fmt = (val) => {
  if (val == null || isNaN(val)) return '—'
  const abs = Math.abs(val)
  const f = abs.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return val < 0 ? `-${f}` : f
}

const TABS = [
  { id: 'lr',       label: 'Laba Rugi',      needsNeraca: false },
  { id: 'neraca',   label: 'Neraca',          needsNeraca: true  },
  { id: 'ak',       label: 'Arus Kas',        needsNeraca: false },
  { id: 'piutang',  label: 'Piutang',         needsNeraca: false },
  { id: 'variance', label: 'Variance',        needsNeraca: false },
]

function filterRows(dataObj, activeMonths, allMonths) {
  if (!dataObj) return dataObj
  if (activeMonths.length === allMonths.length && activeMonths.every((m,i) => m === allMonths[i])) return dataObj
  const src = dataObj.months || allMonths
  const rows = {}
  Object.entries(dataObj.rows || {}).forEach(([acct, val]) => {
    if (Array.isArray(val)) {
      rows[acct] = activeMonths.map(m => { const i = src.indexOf(m); return i >= 0 ? (val[i] ?? 0) : 0 })
    } else if (val && typeof val === 'object') {
      const fm = {}; activeMonths.forEach(m => { if (val[m] !== undefined) fm[m] = val[m] }); rows[acct] = fm
    } else { rows[acct] = val }
  })
  const rawRows = (dataObj.rawRows || []).map(r => ({
    ...r,
    values: Array.isArray(r.values)
      ? activeMonths.map(m => { const i = src.indexOf(m); return i >= 0 ? (r.values[i] ?? 0) : 0 })
      : r.values,
  }))
  return { ...dataObj, rows, months: activeMonths, rawRows }
}

export default function Dashboard({ data, onReset }) {
  const [tab, setTab]                   = useState('lr')
  const [manualBudget, setManualBudget] = useState({ biaya: {}, target: {} })
  const [drilldown, setDrilldown]       = useState(null)
  const [coaDrilldown, setCoaDrilldown] = useState(null)
  const kpiRefs = useRef({})

  const allMonths = useMemo(() => data?.lr?.months || [], [data])
  const hasNeraca = !!(data?.neraca?.rawRows?.length)
  const [activeMonths, setActiveMonths] = useState(allMonths)
  useEffect(() => setActiveMonths(data?.lr?.months || []), [data])

  const filteredLr      = useMemo(() => filterRows(data?.lr,      activeMonths, allMonths), [data, activeMonths, allMonths])
  const filteredNeraca  = useMemo(() => filterRows(data?.neraca,  activeMonths, allMonths), [data, activeMonths, allMonths])
  const filteredAk      = useMemo(() => filterRows(data?.ak,      activeMonths, allMonths), [data, activeMonths, allMonths])
  const filteredPiutang = useMemo(() => filterRows(data?.piutang, activeMonths, allMonths), [data, activeMonths, allMonths])

  const kpi = useMemo(() => {
    const lr  = filteredLr?.rows     || {}
    const nrc = filteredNeraca?.rows || {}
    const bdg = filterRows(data?.budget, activeMonths, allMonths)?.rows || {}
    const rev    = Math.abs(totalOf(lr, ACCT.PENDAPATAN))
    const hpp    = Math.abs(totalOf(lr, ACCT.HPP))
    const laba   = -totalOf(lr, ACCT.LABA_BERSIH)
    const bRev   = Math.abs(totalOf(bdg, ACCT.PENDAPATAN))
    const bruto  = rev - hpp
    const aset   = lastOf(nrc, ACCT.TOTAL_AKTIVA)
    const safe   = (n, d) => (d !== 0 && isFinite(n) && isFinite(d)) ? n / d * 100 : null
    const gm     = safe(bruto, rev)
    const nm     = safe(laba, rev)
    const varPct = bRev > 0 ? (rev - bRev) / bRev * 100 : null
    const rawOpex = totalOf(lr, ACCT.BIAYA_MKT) + totalOf(lr, ACCT.BIAYA_KARY) +
      totalOf(lr, ACCT.BIAYA_GEDUNG) + totalOf(lr, ACCT.BIAYA_UMUM) + totalOf(lr, ACCT.BIAYA_OPS_LN)
    const opex    = Math.abs(rawOpex)
    const labaOps = bruto - opex
    const netNonOp = totalOf(lr,'61999999') + totalOf(lr,'63999999') + totalOf(lr,'64999999') +
      totalOf(lr,'65199999') + totalOf(lr,'65299999')
    const beban75k       = Math.abs(totalOf(lr, '75555555'))
    const labaSblmPajak  = beban75k > 0 ? (bruto - beban75k) : (labaOps + netNonOp)
    const pajak          = Math.abs(totalOf(lr, ACCT.PAJAK || '80999999'))
    return { rev, laba, gm, nm, aset, varPct, bruto, hpp, opex, labaOps, labaSblmPajak, pajak }
  }, [filteredLr, filteredNeraca, data, activeMonths, allMonths])

  const period = activeMonths.length === 0 ? '—'
    : activeMonths.length === 1 ? activeMonths[0]
    : `${activeMonths[0]} – ${activeMonths[activeMonths.length - 1]}`

  const kpis = [
    {
      key: 'pendapatan', label: 'Pendapatan Bersih',
      value: fmt(kpi.rev), sub: `${activeMonths.length} bulan dipilih`,
      color: 'var(--lime)',
      gauge: kpi.rev > 0 ? Math.round((kpi.hpp / kpi.rev) * 100) : null,
      gaugeColor: 'var(--warn)', badge: null,
    },
    {
      key: 'laba', label: 'Laba Bersih',
      value: fmt(kpi.laba), sub: `Net Margin ${(kpi.nm ?? 0).toFixed(1)}%`,
      color: kpi.laba >= 0 ? 'var(--pos)' : 'var(--neg)',
      gauge: kpi.nm != null ? Math.min(Math.max(Math.round(kpi.nm), -100), 100) : null,
      gaugeColor: kpi.laba >= 0 ? 'var(--pos)' : 'var(--neg)',
      badge: kpi.nm != null ? { text: `NM ${kpi.nm.toFixed(1)}%`, type: kpi.nm >= 0 ? 'pos' : 'neg' } : null,
    },
    {
      key: 'gm', label: 'Gross Margin',
      value: `${(kpi.gm ?? 0).toFixed(1)}%`, sub: `Laba Kotor ${fmt(kpi.bruto)}`,
      color: kpi.gm == null ? 'var(--t4)' : kpi.gm >= 30 ? 'var(--pos)' : kpi.gm >= 0 ? 'var(--warn)' : 'var(--neg)',
      gauge: kpi.gm != null ? Math.min(Math.round(Math.abs(kpi.gm)), 100) : null,
      gaugeColor: kpi.gm == null ? 'var(--t4)' : kpi.gm >= 30 ? 'var(--pos)' : kpi.gm >= 0 ? 'var(--warn)' : 'var(--neg)',
      badge: kpi.gm != null
        ? { text: kpi.gm >= 30 ? 'Baik' : kpi.gm >= 0 ? 'Cukup' : 'Rugi', type: kpi.gm >= 30 ? 'pos' : kpi.gm >= 0 ? 'neu' : 'neg' }
        : null,
    },
    {
      key: 'aktiva', label: 'Total Aktiva',
      value: fmt(kpi.aset), sub: 'Saldo akhir periode',
      color: 'var(--blue)', gauge: null, badge: null,
    },
    {
      key: 'budget', label: 'vs Budget',
      value: kpi.varPct != null ? `${kpi.varPct >= 0 ? '+' : ''}${kpi.varPct.toFixed(1)}%` : '—',
      sub: kpi.varPct != null ? (kpi.varPct >= 0 ? 'Di atas target' : 'Di bawah target') : 'Belum ada budget',
      color: kpi.varPct == null ? 'var(--t4)' : kpi.varPct >= 0 ? 'var(--pos)' : 'var(--neg)',
      gauge: null,
      badge: kpi.varPct != null
        ? { text: kpi.varPct >= 0 ? '↑ Target' : '↓ Target', type: kpi.varPct >= 0 ? 'pos' : 'neg' }
        : null,
    },
  ]

  const budgetRowsForDrilldown = useMemo(
    () => filterRows(data?.budget, activeMonths, allMonths),
    [data, activeMonths, allMonths]
  )

  const TAB_CONTENT = {
    lr: (<>
      <RatioPanel lrData={filteredLr} neracaData={filteredNeraca} months={activeMonths} hasNeraca={hasNeraca}/>
      <Section title="Laporan Laba Rugi" dot="var(--blue)" defaultOpen noPad>
        <TabLabRugi data={filteredLr} months={activeMonths}/>
      </Section>
    </>),
    neraca: (
      <Section title="Neraca" dot="var(--purple)" defaultOpen noPad>
        <TabNeraca data={filteredNeraca} months={activeMonths}/>
      </Section>
    ),
    ak: (
      <Section title="Arus Kas" dot="#0EA5E9" defaultOpen noPad>
        <TabArusKas data={filteredLr} months={activeMonths}/>
      </Section>
    ),
    piutang: (
      <Section title="Piutang" dot="var(--warn)" defaultOpen noPad>
        <TabPiutang data={filteredNeraca} months={activeMonths}/>
      </Section>
    ),
    variance: (
      <Section title="Variance & Budget" dot="var(--neg)" defaultOpen noPad>
        <div style={{ padding: '20px 24px' }}>
          <VarianceSection
            allMonths={allMonths} activeMonths={activeMonths}
            manualBudget={manualBudget} setManualBudget={setManualBudget}
            filteredLr={filteredLr}
          />
        </div>
      </Section>
    ),
  }

  return (
    <CoaContext.Provider value={{ openCoa: setCoaDrilldown, lrData: filteredLr }}>
      <style>{css}</style>
      <style>{`
        .dash-shell{min-height:100vh;background:var(--bg);display:flex;flex-direction:column}

        /* topbar */
        .topbar{height:48px;background:var(--surface);border-bottom:1px solid var(--rule);
          display:flex;align-items:center;justify-content:space-between;
          padding:0 20px;position:sticky;top:0;z-index:50;flex-shrink:0;gap:12px}
        .topbar-left{display:flex;align-items:center;gap:10px}
        .topbar-logo{width:26px;height:26px;background:var(--accent,#e8533a);border-radius:7px;
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:13px;color:#fff;flex-shrink:0}
        .topbar-name{font-size:13px;font-weight:700;color:var(--t1);letter-spacing:-.4px}
        .topbar-sub{font-size:9px;color:var(--t4);text-transform:uppercase;letter-spacing:.08em}
        .topbar-sep{width:1px;height:16px;background:var(--rule);margin:0 2px}
        .topbar-period{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)}
        .topbar-right{display:flex;align-items:center;gap:8px}

        /* kpi grid */
        .kpi-grid-new{display:grid;grid-template-columns:repeat(5,1fr);
          border-bottom:1px solid var(--rule);background:var(--bg)}
        .kpi-cell{padding:16px 18px 14px;background:var(--surface);
          border-right:1px solid var(--rule);cursor:pointer;position:relative;
          transition:background .12s;overflow:hidden}
        .kpi-cell:last-child{border-right:none}
        .kpi-cell:hover{background:var(--surface2,#181816)}
        .kpi-cell--open{background:var(--surface2,#181816)}
        .kpi-cell__accent{position:absolute;top:0;left:0;right:0;height:2px;
          background:var(--kc);opacity:.9}
        .kpi-cell__label{font-size:9px;text-transform:uppercase;letter-spacing:.1em;
          color:var(--t4);margin-bottom:8px;font-family:var(--mono,monospace)}
        .kpi-cell__value{font-size:24px;font-weight:700;color:var(--t1);
          letter-spacing:-1px;line-height:1;margin-bottom:6px;
          font-variant-numeric:tabular-nums}
        .kpi-cell__bottom{display:flex;align-items:center;justify-content:space-between;gap:6px}
        .kpi-cell__sub{font-size:10px;color:var(--t4);font-family:var(--mono,monospace)}
        .kpi-cell__badge{font-size:9px;padding:2px 7px;border-radius:100px;
          font-family:var(--mono,monospace);white-space:nowrap;flex-shrink:0}
        .kpi-cell__badge--pos{background:rgba(74,222,128,.12);color:#4ade80}
        .kpi-cell__badge--neg{background:rgba(248,113,113,.12);color:#f87171}
        .kpi-cell__badge--neu{background:rgba(250,204,21,.1);color:#fbbf24}
        .kpi-cell__gauge{position:absolute;right:12px;top:50%;transform:translateY(-50%)}

        /* tabs */
        .tabbar-new{background:var(--surface);border-bottom:1px solid var(--rule);
          display:flex;align-items:stretch;padding:0 20px;gap:0;
          overflow-x:auto;scrollbar-width:none}
        .tabbar-new::-webkit-scrollbar{display:none}
        .tab-new{display:flex;align-items:center;gap:6px;background:transparent;border:none;
          border-bottom:2px solid transparent;color:var(--t3);
          font-size:12px;font-weight:500;padding:0 14px;height:40px;cursor:pointer;
          transition:color .12s,border-color .12s;white-space:nowrap;margin-bottom:-1px;
          font-family:inherit}
        .tab-new:hover{color:var(--t2)}
        .tab-new.active{color:var(--t1);border-bottom-color:var(--accent,#e8533a)}
        .tab-new--disabled{opacity:.35;cursor:not-allowed}
        .tab-spacer{margin-left:auto;display:flex;align-items:center;
          font-size:9px;color:var(--t4);text-transform:uppercase;letter-spacing:.08em;padding-right:2px}

        /* content */
        .tab-body{flex:1;padding:20px 20px 80px;overflow:auto;
          display:flex;flex-direction:column;gap:14px}

        @media(max-width:860px){
          .kpi-grid-new{grid-template-columns:repeat(3,1fr)}
          .kpi-cell:nth-child(3){border-right:none}
        }
        @media(max-width:540px){
          .kpi-grid-new{grid-template-columns:repeat(2,1fr)}
          .kpi-cell:nth-child(2),.kpi-cell:nth-child(4){border-right:none}
          .kpi-cell__value{font-size:20px}
        }
      `}</style>

      <div className="dash-shell">

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-logo">F</div>
            <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
              <span className="topbar-name">IVP FIN 30</span>
              <span className="topbar-sub">Financial Dashboard</span>
            </div>
            <div className="topbar-sep"/>
            <div className="topbar-period">
              <span className="period-dot"/>
              {period}
            </div>
          </div>
          <div className="topbar-right">
            <PeriodPicker allMonths={allMonths} activeMonths={activeMonths} onChange={setActiveMonths}/>
            <button className="top-btn" onClick={onReset}>↑ Upload Ulang</button>
          </div>
        </header>

        {/* ── KPI Grid ── */}
        <div style={{ position:'relative', zIndex:40 }}>
          <div className="kpi-grid-new">
            {kpis.map((k, i) => {
              const isOpen = drilldown?.key === k.key
              const gaugeEl = k.gauge != null ? (() => {
                const r = 18, cx = 22, cy = 22, circ = 2 * Math.PI * r
                const dash = circ * Math.min(Math.abs(k.gauge), 100) / 100
                return (
                  <div className="kpi-cell__gauge">
                    <svg viewBox="0 0 44 44" width={44} height={44}>
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rule2,rgba(255,255,255,.07))" strokeWidth="3"/>
                      <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke={k.gaugeColor} strokeWidth="3"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeLinecap="round"
                        style={{ transition:'stroke-dasharray .5s ease', transform:'rotate(-90deg)', transformOrigin:'50% 50%' }}
                      />
                    </svg>
                    <div style={{
                      position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:9, fontWeight:700, color:k.gaugeColor,
                    }}>{k.gauge}%</div>
                  </div>
                )
              })() : null

              return (
                <div key={i}
                  ref={el => kpiRefs.current[k.key] = el}
                  className={`kpi-cell${isOpen ? ' kpi-cell--open' : ''}`}
                  style={{ '--kc': k.color, paddingRight: k.gauge != null ? '64px' : '18px' }}
                  onClick={e => { e.stopPropagation(); setDrilldown(isOpen ? null : { key:k.key, el:kpiRefs.current[k.key] }) }}
                >
                  <div className="kpi-cell__accent"/>
                  <div className="kpi-cell__label">{k.label}</div>
                  <div className="kpi-cell__value">{k.value}</div>
                  <div className="kpi-cell__bottom">
                    <div className="kpi-cell__sub">{k.sub}</div>
                    {k.badge && <div className={`kpi-cell__badge kpi-cell__badge--${k.badge.type}`}>{k.badge.text}</div>}
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

        {/* ── Tab Bar ── */}
        <div className="tabbar-new">
          {TABS.map(t => {
            const dis = t.needsNeraca && !hasNeraca
            return (
              <button key={t.id}
                className={`tab-new${tab === t.id ? ' active' : ''}${dis ? ' tab-new--disabled' : ''}`}
                onClick={() => !dis && setTab(t.id)}
                title={dis ? 'Upload file Neraca untuk mengaktifkan tab ini' : undefined}
              >
                {t.label}
                {dis && <span style={{ fontSize:8, opacity:.5 }}>✕</span>}
              </button>
            )
          })}
          <div className="tab-spacer">{activeMonths.length} bln</div>
        </div>

        {/* ── Content ── */}
        <div className="tab-body">
          {TAB_CONTENT[tab]}
        </div>

      </div>

      {coaDrilldown && (
        <CoaDrilldown subject={coaDrilldown} lrData={filteredLr} onClose={() => setCoaDrilldown(null)}/>
      )}
    </CoaContext.Provider>
  )
}
