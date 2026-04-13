import { useState, useMemo, useRef, useEffect } from 'react'
import { ACCT, totalOf, lastOf } from '../lib/parser'
import { css } from '../lib/dashboardCss'
import styles from './dashboard.module.css'
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
    const beban75k      = Math.abs(totalOf(lr, '75555555'))
    const labaSblmPajak = beban75k > 0 ? (bruto - beban75k) : (labaOps + netNonOp)
    const pajak         = Math.abs(totalOf(lr, ACCT.PAJAK || '80999999'))
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
      {/* shared component styles (RatioPanel, Section, tables, dll) */}
      <style>{css}</style>

      <div className={styles.root}>

        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <div className={styles.logoMark}>F</div>
              <div className={styles.logoStack}>
                <span className={styles.logoName}>IVP FIN 30</span>
                <span className={styles.logoSub}>Financial Dashboard</span>
              </div>
            </div>
            <div className={styles.headerSep}/>
            <div className={styles.periodBadge}>
              <span className={styles.periodDot}/>
              {period}
            </div>
          </div>
          <div className={styles.headerRight}>
            <PeriodPicker allMonths={allMonths} activeMonths={activeMonths} onChange={setActiveMonths}/>
            <button className={styles.btnReset} onClick={onReset}>
              ↑ Upload Ulang
            </button>
          </div>
        </header>

        {/* ── KPI Strip ── */}
        <div className={styles.kpiStrip}>
          {kpis.map((k, i) => {
            const isOpen = drilldown?.key === k.key

            const gaugeEl = k.gauge != null ? (() => {
              const r = 17, cx = 21, cy = 21, circ = 2 * Math.PI * r
              const dash = circ * Math.min(Math.abs(k.gauge), 100) / 100
              return (
                <div className={styles.kpiGauge}>
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
                  <div className={styles.kpiGaugePct} style={{ color: k.gaugeColor }}>
                    {k.gauge}%
                  </div>
                </div>
              )
            })() : null

            const badgeClass = k.badge
              ? [
                  styles.kpiBadge,
                  k.badge.type === 'pos' ? styles.kpiBadgePos
                  : k.badge.type === 'neg' ? styles.kpiBadgeNeg
                  : styles.kpiBadgeNeu,
                ].join(' ')
              : null

            return (
              <div
                key={i}
                ref={el => kpiRefs.current[k.key] = el}
                className={[styles.kpiCard, isOpen ? styles.kpiCardOpen : ''].join(' ')}
                style={{ '--kc': k.color }}
                onClick={e => {
                  e.stopPropagation()
                  setDrilldown(isOpen ? null : { key: k.key, el: kpiRefs.current[k.key] })
                }}
              >
                <div className={styles.kpiBar}/>
                <div className={styles.kpiLabel}>{k.label}</div>
                <div
                  className={styles.kpiValue}
                  style={{ paddingRight: k.gauge != null ? '52px' : 0 }}
                >
                  {k.value}
                </div>
                <div className={styles.kpiBottom}>
                  <div className={styles.kpiSub}>{k.sub}</div>
                  {k.badge && <div className={badgeClass}>{k.badge.text}</div>}
                </div>
                {gaugeEl}
              </div>
            )
          })}

          {drilldown && (
            <KpiDrilldown
              kpiKey={drilldown.key} kpi={kpi}
              lrData={filteredLr} budgetData={budgetRowsForDrilldown}
              anchorEl={drilldown.el} onClose={() => setDrilldown(null)}
            />
          )}
        </div>

        {/* ── Tab Bar ── */}
        <div className={styles.tabBar}>
          {TABS.map(t => {
            const dis = t.needsNeraca && !hasNeraca
            return (
              <button
                key={t.id}
                className={[
                  styles.tabBtn,
                  tab === t.id ? styles.tabBtnActive   : '',
                  dis          ? styles.tabBtnDisabled : '',
                ].filter(Boolean).join(' ')}
                onClick={() => !dis && setTab(t.id)}
                title={dis ? 'Upload file Neraca untuk mengaktifkan tab ini' : undefined}
              >
                {t.label}
                {dis && <span className={styles.tabDisIcon}>✕</span>}
              </button>
            )
          })}
          <div className={styles.tabEnd}>
            <span className={styles.tabEndDot}/>
            {activeMonths.length} bln
          </div>
        </div>

        {/* ── Content ── */}
        <div className={styles.tabContent}>
          {TAB_CONTENT[tab]}
        </div>

      </div>

      {coaDrilldown && (
        <CoaDrilldown subject={coaDrilldown} lrData={filteredLr} onClose={() => setCoaDrilldown(null)}/>
      )}
    </CoaContext.Provider>
  )
}
