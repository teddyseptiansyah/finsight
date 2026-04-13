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
  { id: 'lr',       label: 'Laba Rugi',  needsNeraca: false },
  { id: 'neraca',   label: 'Neraca',     needsNeraca: true  },
  { id: 'ak',       label: 'Arus Kas',   needsNeraca: false },
  { id: 'piutang',  label: 'Piutang',    needsNeraca: false },
  { id: 'variance', label: 'Variance',   needsNeraca: false },
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

/* ── inline CSS ──────────────────────────────────────────────────────────── */
const SHELL_CSS = `
.dash-shell {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  font-family: var(--sans);
}

/* ── Topbar ── */
.topbar {
  height: 52px;
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 50;
  flex-shrink: 0;
  gap: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  background: rgba(19,18,16,.92);
}
.topbar-left  { display: flex; align-items: center; gap: 10px; }
.topbar-right { display: flex; align-items: center; gap: 8px; }

.topbar-logo {
  width: 28px; height: 28px;
  background: linear-gradient(135deg, #e8533a 0%, #c23f28 100%);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 13px; color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(232,83,58,.35);
  letter-spacing: -.5px;
}
.topbar-info { display: flex; flex-direction: column; gap: 0; }
.topbar-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--t1);
  letter-spacing: -.4px;
  line-height: 1.2;
}
.topbar-sub {
  font-size: 9px;
  color: var(--t4);
  text-transform: uppercase;
  letter-spacing: .1em;
  font-family: var(--mono);
}
.topbar-sep {
  width: 1px; height: 18px;
  background: var(--rule);
  margin: 0 4px;
}
.topbar-period {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px;
  color: var(--t3);
  font-family: var(--mono);
}

/* ── KPI Grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border-bottom: 1px solid var(--rule);
  background: var(--bg);
}

.kpi-cell {
  padding: 18px 20px 15px;
  background: var(--surface);
  border-right: 1px solid var(--rule);
  cursor: pointer;
  position: relative;
  transition: background .14s;
  overflow: hidden;
  user-select: none;
}
.kpi-cell:last-child  { border-right: none; }
.kpi-cell:hover       { background: var(--panel); }
.kpi-cell--open       { background: var(--panel); }

/* accent line top */
.kpi-cell__bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--kc, var(--t4));
  opacity: .8;
  transition: opacity .15s;
}
.kpi-cell:hover .kpi-cell__bar,
.kpi-cell--open .kpi-cell__bar { opacity: 1; }

/* subtle glow on open */
.kpi-cell--open::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 30% 0%, rgba(232,83,58,.04) 0%, transparent 70%);
  pointer-events: none;
}

.kpi-cell__label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--t4);
  font-family: var(--mono);
  margin-bottom: 9px;
}
.kpi-cell__value {
  font-size: 26px;
  font-weight: 700;
  color: var(--t1);
  letter-spacing: -1.2px;
  line-height: 1;
  margin-bottom: 8px;
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
  padding-right: var(--gauge-pad, 0px);
}
.kpi-cell__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.kpi-cell__sub {
  font-size: 10px;
  color: var(--t4);
  font-family: var(--mono);
}
.kpi-cell__badge {
  font-size: 9px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 100px;
  font-family: var(--mono);
  white-space: nowrap;
  flex-shrink: 0;
}
.kpi-cell__badge--pos  { background: var(--pos-dim);  color: var(--pos); }
.kpi-cell__badge--neg  { background: var(--neg-dim);  color: var(--neg); }
.kpi-cell__badge--neu  { background: var(--warn-dim); color: var(--warn); }

/* circular gauge */
.kpi-gauge {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
}
.kpi-gauge__pct {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  font-family: var(--mono);
}

/* ── Tab Bar ── */
.tabbar {
  height: 42px;
  background: var(--surface);
  border-bottom: 1px solid var(--rule);
  display: flex;
  align-items: stretch;
  padding: 0 20px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.tabbar::-webkit-scrollbar { display: none; }

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--t3);
  font-size: 11.5px;
  font-weight: 500;
  padding: 0 14px;
  height: 100%;
  cursor: pointer;
  transition: color .14s, border-color .14s;
  white-space: nowrap;
  margin-bottom: -1px;
  font-family: var(--sans);
  position: relative;
  letter-spacing: -.1px;
}
.tab-btn:hover { color: var(--t2); }
.tab-btn.active {
  color: var(--t1);
  border-bottom-color: var(--accent);
  font-weight: 600;
}
.tab-btn--disabled {
  opacity: .3;
  cursor: not-allowed;
  pointer-events: none;
}
.tab-dis-icon { font-size: 8px; opacity: .6; }

.tab-end {
  margin-left: auto;
  display: flex;
  align-items: center;
  font-size: 9px;
  font-family: var(--mono);
  color: var(--t4);
  letter-spacing: .06em;
  padding-right: 2px;
  gap: 4px;
}
.tab-end__dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--t4);
}

/* ── Tab Content ── */
.tab-body {
  flex: 1;
  padding: 20px 20px 80px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  .kpi-cell:nth-child(3) { border-right: none; }
}
@media (max-width: 580px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .kpi-cell:nth-child(2),
  .kpi-cell:nth-child(4) { border-right: none; }
  .kpi-cell__value { font-size: 21px; }
  .topbar { padding: 0 14px; }
  .tab-body { padding: 14px 14px 60px; }
}
`

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
      <style>{SHELL_CSS}</style>

      <div className="dash-shell">

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-logo">F</div>
            <div className="topbar-info">
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
        <div style={{ position: 'relative', zIndex: 40 }}>
          <div className="kpi-grid">
            {kpis.map((k, i) => {
              const isOpen = drilldown?.key === k.key

              const gaugeEl = k.gauge != null ? (() => {
                const r = 17, cx = 21, cy = 21, circ = 2 * Math.PI * r
                const dash = circ * Math.min(Math.abs(k.gauge), 100) / 100
                return (
                  <div className="kpi-gauge">
                    <svg viewBox="0 0 42 42" width={42} height={42}>
                      <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke="rgba(255,255,255,.06)" strokeWidth="2.5"/>
                      <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke={k.gaugeColor} strokeWidth="2.5"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeLinecap="round"
                        style={{
                          transition: 'stroke-dasharray .55s cubic-bezier(.4,0,.2,1)',
                          transform: 'rotate(-90deg)',
                          transformOrigin: '50% 50%',
                        }}
                      />
                    </svg>
                    <div className="kpi-gauge__pct" style={{ color: k.gaugeColor }}>
                      {k.gauge}%
                    </div>
                  </div>
                )
              })() : null

              return (
                <div
                  key={i}
                  ref={el => kpiRefs.current[k.key] = el}
                  className={`kpi-cell${isOpen ? ' kpi-cell--open' : ''}`}
                  style={{ '--kc': k.color }}
                  onClick={e => {
                    e.stopPropagation()
                    setDrilldown(isOpen ? null : { key: k.key, el: kpiRefs.current[k.key] })
                  }}
                >
                  <div className="kpi-cell__bar"/>
                  <div className="kpi-cell__label">{k.label}</div>
                  <div
                    className="kpi-cell__value"
                    style={{ paddingRight: k.gauge != null ? '52px' : 0 }}
                  >
                    {k.value}
                  </div>
                  <div className="kpi-cell__bottom">
                    <div className="kpi-cell__sub">{k.sub}</div>
                    {k.badge && (
                      <div className={`kpi-cell__badge kpi-cell__badge--${k.badge.type}`}>
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

        {/* ── Tab Bar ── */}
        <div className="tabbar">
          {TABS.map(t => {
            const dis = t.needsNeraca && !hasNeraca
            return (
              <button
                key={t.id}
                className={`tab-btn${tab === t.id ? ' active' : ''}${dis ? ' tab-btn--disabled' : ''}`}
                onClick={() => !dis && setTab(t.id)}
                title={dis ? 'Upload file Neraca untuk mengaktifkan tab ini' : undefined}
              >
                {t.label}
                {dis && <span className="tab-dis-icon">✕</span>}
              </button>
            )
          })}
          <div className="tab-end">
            <span className="tab-end__dot"/>
            {activeMonths.length} bln
          </div>
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
