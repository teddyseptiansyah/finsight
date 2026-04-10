import { useRef, useEffect } from 'react'
import { ACCT, totalOf } from '../../lib/parser'
const fmt = (val) => {
  if (val == null || isNaN(val)) return '—'
  const abs = Math.abs(val)
  const formatted = abs.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return val < 0 ? `-${formatted}` : formatted
}

import { useContext } from 'react'
import { CoaContext } from '../../lib/CoaContext'

export default function KpiDrilldown({ kpiKey, kpi, lrData, budgetData, anchorEl, onClose }) {
  const { openCoa } = useContext(CoaContext) || {}
  const popRef = useRef()
  const lr     = lrData?.rows    || {}
  const bdg    = budgetData?.rows || {}

  useEffect(() => {
    const fn = e => {
      if (popRef.current?.contains(e.target)) return
      if (anchorEl?.contains(e.target))       return
      onClose()
    }
    const id = setTimeout(() => document.addEventListener('mousedown', fn), 0)
    return () => { clearTimeout(id); document.removeEventListener('mousedown', fn) }
  }, [onClose, anchorEl])

  // Popup ditampilkan di tengah layar seperti modal

  const Spark = ({ values, color }) => {
    if (!values?.length || !values.some(v => v !== 0)) return null
    const W = 328, H = 34, p = 3
    const max = Math.max(...values.map(Math.abs), 1)
    const coords = values.map((v, i) => ({
      x: p + (i / Math.max(values.length - 1, 1)) * (W - p * 2),
      y: H - p - (Math.abs(v) / max) * (H - p * 2),
    }))
    const pts      = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
    const fillPts  = `${coords[0].x.toFixed(1)},${H} ${pts} ${coords[coords.length-1].x.toFixed(1)},${H}`
    const gradId   = `sg_${color.replace(/[^a-z0-9]/gi,'')}`
    return (
      <svg width={W} height={H} style={{display:'block',overflow:'visible'}}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity=".2"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill={`url(#${gradId})`}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        {coords.map((c, i) => <circle key={i} cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} r="2.5" fill={color}/>)}
      </svg>
    )
  }

  const mRow = (key, abs = false) => {
    const row = lr[key] || []
    return abs ? row.map(v => Math.abs(v || 0)) : row.map(v => v || 0)
  }

  const { rev, hpp, bruto, laba, nm, gm, aset, varPct, opex, labaOps, labaSblmPajak } = kpi
  const maxVal   = Math.max(rev, 1)
  const revRow   = mRow(ACCT.PENDAPATAN, true)
  const hppRow   = mRow(ACCT.HPP,        true)
  const labaRow  = mRow(ACCT.LABA_BERSIH, false)
  const brutoRow = revRow.map((v, i) => v - (hppRow[i] || 0))

  // Helper: buang akun subtotal/total/header
  const isTotalAcct = (no, name = '') => {
    if (!no) return true
    if (no.endsWith('999999') || no.endsWith('000000')) return true
    if (no.slice(-2) === '99') return true
    if (no.slice(-2) === '00') return true
    if (name && name.toUpperCase().includes('TOTAL')) return true
    return false
  }

  // Build sub-rows langsung dari lr rows (filtered, tanpa akun total)
  const raw = lrData?.rawRows || []
  const nameMapKpi = {}
  raw.forEach(r => { nameMapKpi[r.no] = r.name || r.no })

  const buildSubs = (prefix) => Object.entries(lr)
    .filter(([no]) => {
      if (!no.startsWith(prefix)) return false
      if (isTotalAcct(no, nameMapKpi[no] || '')) return false
      return true
    })
    .map(([no, arr]) => ({
      no,
      name: nameMapKpi[no] || no,
      val: Math.abs(Array.isArray(arr) ? arr.reduce((a,b) => a+(b||0), 0) : 0)
    }))
    .filter(a => a.val > 0)
    .sort((a, b) => b.val - a.val)

  const revSubs   = buildSubs('41')
  const biayaSubs = buildSubs('5')

  const cfgs = {
    pendapatan: {
      title: 'Breakdown Pendapatan', dot: '#3B82F6',
      heroVal: fmt(rev), heroColor: 'var(--t1)',
      heroLabel: 'Total Kumulatif', heroSub: 'Akun 41xxxxxx',
      spark: { values: revRow, color: '#3B82F6', label: 'Pendapatan per bulan' },
      rows: revSubs.length
        ? revSubs.map(s => ({ name: s.name, sub: s.no, acctNo: s.no, prefix: s.no.slice(0,6), val: fmt(s.val), pct: Math.round(s.val/maxVal*100), color:'#3B82F6', valColor:'var(--t1)' }))
        : [{ name:'Total Pendapatan', sub:ACCT.PENDAPATAN, acctNo:ACCT.PENDAPATAN, prefix:'41', val:fmt(rev), pct:100, color:'#3B82F6', valColor:'var(--t1)' }],
      formula: 'Σ akun 41xxxxxx (kredit → abs)',
    },
    laba: {
      title: 'Struktur Laba Bersih', dot: laba>=0?'#22C55E':'#EF4444',
      heroVal: fmt(laba), heroColor: laba>=0?'var(--pos)':'var(--neg)',
      heroLabel: 'Net Margin', heroSub: `${nm!=null?nm.toFixed(1):'—'}% dari pendapatan`,
      spark: { values: labaRow, color: laba>=0?'#22C55E':'#EF4444', label: 'Laba bersih per bulan' },
      rows: [
        { name:'Pendapatan', sub:'41xxxxxx', acctNo:ACCT.PENDAPATAN, prefix:'41', val:fmt(rev), pct:100, color:'#3B82F6', valColor:'var(--t1)' },
        { name:'− HPP',      sub:'42xxxxxx', acctNo:ACCT.HPP, prefix:'42', val:`(${fmt(hpp)})`, pct:Math.round(hpp/maxVal*100), color:'#EF4444', valColor:'var(--neg)', italic:true },
        { divider:true },
        { name:'= Laba Kotor',        sub:'', val:fmt(bruto),        pct:Math.round(Math.abs(bruto)/maxVal*100),       color:bruto>=0?'#22C55E':'#EF4444',       valColor:bruto>=0?'var(--pos)':'var(--neg)',       bold:true },
        { name:'− Biaya Operasional', sub:'51–55', val:`(${fmt(opex)})`, pct:Math.round(opex/maxVal*100),             color:'#F59E0B', valColor:'var(--warn)', italic:true },
        { divider:true },
        { name:'= Laba Operasional',  sub:'', val:fmt(labaOps),      pct:Math.round(Math.abs(labaOps)/maxVal*100),    color:labaOps>=0?'#22C55E':'#EF4444',     valColor:labaOps>=0?'var(--pos)':'var(--neg)',     bold:true },
        { name:'± Pos Luar Usaha',    sub:'61–65', val:fmt(labaSblmPajak - labaOps), pct:Math.round(Math.abs(labaSblmPajak-labaOps)/maxVal*100), color:'#8B5CF6', valColor:'var(--t2)', italic:true },
        { divider:true },
        { name:'= Laba Sebelum Pajak', sub:'', val:fmt(labaSblmPajak), pct:Math.round(Math.abs(labaSblmPajak)/maxVal*100), color:labaSblmPajak>=0?'#22C55E':'#EF4444', valColor:labaSblmPajak>=0?'var(--pos)':'var(--neg)', bold:true },
        { name:'= Laba Bersih', sub:'89xxxxxx', val:fmt(laba), pct:Math.round(Math.abs(laba)/maxVal*100), color:laba>=0?'#22C55E':'#EF4444', valColor:laba>=0?'var(--pos)':'var(--neg)', bold:true },
      ],
      formula: 'Penjualan − HPP = Laba Kotor − Biaya Ops = Laba Operasional ± Non-Ops − Pajak = Laba Bersih',
    },
    gm: {
      title: 'Gross Margin Detail', dot: gm>=0?'#F59E0B':'#EF4444',
      heroVal: `${(gm??0).toFixed(1)}%`, heroColor: gm>=0?'var(--warn)':'var(--neg)',
      heroLabel: 'Gross Margin', heroSub: `Laba Kotor: ${fmt(bruto)}`,
      spark: { values: brutoRow, color: '#F59E0B', label: 'Laba kotor per bulan' },
      rows: [
        { name:'Pendapatan', sub:ACCT.PENDAPATAN, val:fmt(rev), pct:100, color:'#3B82F6', valColor:'var(--t1)' },
        { name:'− HPP',      sub:ACCT.HPP, val:`(${fmt(hpp)})`, pct:Math.round(hpp/maxVal*100), color:'#EF4444', valColor:'var(--neg)', italic:true },
        { divider:true },
        { name:'= Laba Kotor', sub:'', val:fmt(bruto), pct:Math.round(Math.abs(bruto)/maxVal*100), color:bruto>=0?'#22C55E':'#EF4444', valColor:bruto>=0?'var(--pos)':'var(--neg)', bold:true },
        ...( biayaSubs.length ? [{ dim:true, name:'Rincian Biaya Operasional ▾' }] : [] ),
        ...biayaSubs.slice(0,4).map(s => ({ name:s.name, sub:s.no, acctNo:s.no, prefix:s.no.slice(0,2), val:fmt(s.val), pct:Math.round(s.val/maxVal*100), color:'#A78BFA', valColor:'var(--t3)' })),
      ],
      formula: '(Pendapatan − HPP) / Pendapatan × 100',
    },
    aktiva: {
      title: 'Total Aktiva', dot: '#1D4ED8',
      heroVal: fmt(aset), heroColor: 'var(--blue)',
      heroLabel: 'Saldo Akhir', heroSub: 'Periode terakhir',
      spark: null,
      rows: [{ name:'Total Aktiva', sub:ACCT.TOTAL_AKTIVA, val:fmt(aset), pct:100, color:'#1D4ED8', valColor:'var(--blue)', bold:true }],
      formula: 'Aktiva Lancar + Aktiva Tetap + Lainnya',
    },
    budget: () => {
      const bRev   = Math.abs(totalOf(bdg, ACCT.PENDAPATAN))
      const bLaba  = totalOf(bdg, ACCT.LABA_BERSIH)
      const rdiff  = bRev  > 0    ? rev  - bRev  : null
      const ldiff  = bLaba !== 0  ? laba - bLaba  : null
      return {
        title: 'Variance vs Budget', dot: varPct==null?'#A09C90':varPct>=0?'#22C55E':'#EF4444',
        heroVal: varPct!=null?`${varPct>=0?'+':''}${varPct.toFixed(1)}%`:'—',
        heroColor: varPct==null?'var(--t4)':varPct>=0?'var(--pos)':'var(--neg)',
        heroLabel: 'Variance Pendapatan', heroSub: varPct!=null?(varPct>=0?'Di atas target ✓':'Di bawah target'):'Budget belum diisi',
        spark: null,
        rows: varPct!=null ? [
          { name:'Realisasi', sub:'', val:fmt(rev),  pct:100, color:'#3B82F6', valColor:'var(--t1)' },
          { name:'Budget',    sub:'', val:fmt(bRev), pct:Math.round(bRev/Math.max(rev,1)*100), color:'#94A3B8', valColor:'var(--t3)' },
          { divider:true },
          { name:'Selisih Pendapatan', sub:'', val:rdiff!=null?`${rdiff>=0?'+':''}${fmt(rdiff)}`:'—',
            pct:rdiff!=null?Math.min(Math.abs(rdiff)/Math.max(rev,1)*100,100):0,
            color:rdiff>=0?'#22C55E':'#EF4444', valColor:rdiff>=0?'var(--pos)':'var(--neg)', bold:true },
          ...(ldiff!=null?[{ name:'Selisih Laba Bersih', sub:'', val:`${ldiff>=0?'+':''}${fmt(ldiff)}`,
            pct:Math.min(Math.abs(ldiff)/Math.max(rev,1)*100,100),
            color:ldiff>=0?'#22C55E':'#EF4444', valColor:ldiff>=0?'var(--pos)':'var(--neg)', bold:true }]:[]),
        ] : [{ dim:true, name:'Upload file budget untuk melihat variance' }],
        formula: '(Realisasi − Budget) / Budget × 100',
      }
    },
  }

  const cfgRaw = cfgs[kpiKey]
  const cfg    = typeof cfgRaw === 'function' ? cfgRaw() : (cfgRaw || cfgs.pendapatan)

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:399,background:'rgba(17,16,9,.45)',backdropFilter:'blur(3px)',animation:'coaFadeIn .18s ease both'}}/>
      <div ref={popRef} style={{position:'fixed',zIndex:400,top:'calc(50% + 25px)',left:'50%',transform:'translate(-50%,-50%)',width:420,maxWidth:'calc(100vw - 32px)',maxHeight:'min(520px, calc(100vh - 120px))',background:'var(--canvas)',border:'1px solid var(--line2)',borderRadius:14,boxShadow:'0 32px 80px rgba(0,0,0,.22), 0 8px 24px rgba(0,0,0,.12)',overflow:'hidden',display:'flex',flexDirection:'column',animation:'kdpIn .2s cubic-bezier(.2,.8,.3,1) both'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px 8px',background:'var(--bg)',borderBottom:'1px solid var(--line)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:cfg.dot,flexShrink:0}}/>
            <span style={{fontFamily:'var(--sans)',fontSize:12,fontWeight:600,color:'var(--t1)'}}>{cfg.title}</span>
          </div>
          <button onClick={onClose} style={{width:22,height:22,borderRadius:'50%',border:'1px solid var(--line2)',background:'transparent',color:'var(--t3)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1,padding:0}}>✕</button>
        </div>

        <div style={{padding:'8px 16px 8px',borderBottom:'1px solid var(--line)',display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
          <div style={{fontFamily:'var(--sans)',fontSize:22,fontWeight:700,letterSpacing:'-1px',lineHeight:1,color:cfg.heroColor}}>{cfg.heroVal}</div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t4)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:3}}>{cfg.heroLabel}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:10.5,color:'var(--t3)'}}>{cfg.heroSub}</div>
          </div>
        </div>

        {cfg.spark?.values?.length > 1 && (
          <div style={{padding:'6px 16px 6px',borderBottom:'1px solid var(--line)',background:'var(--bg)'}}>
            <div style={{fontFamily:'var(--mono)',fontSize:8.5,color:'var(--t4)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4}}>{cfg.spark.label}</div>
            <Spark values={cfg.spark.values} color={cfg.spark.color}/>
          </div>
        )}

        <div style={{padding:'4px 0',overflowY:'auto',flex:1,maxHeight:240}}>
          {cfg.rows.map((row, i) => row.divider ? (
            <div key={i} style={{height:1,background:'var(--line)',margin:'4px 0'}}/>
          ) : row.dim ? (
            <div key={i} style={{padding:'6px 16px',fontFamily:'var(--mono)',fontSize:9,color:'var(--t4)',letterSpacing:'.06em'}}>{row.name}</div>
          ) : (
            <div key={i}
              style={{display:'grid',gridTemplateColumns:'1fr 72px 88px',alignItems:'center',gap:8,padding:'5px 16px',transition:'background .1s',cursor:row.acctNo?'pointer':'default'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              onClick={()=>row.acctNo&&openCoa?.({acctNo:row.acctNo,prefix:row.prefix||row.acctNo?.slice(0,2),color:row.color||'#3B82F6',label:row.name})}
            >
              <div style={{fontFamily:'var(--sans)',fontSize:12,color:'var(--t2)',opacity:row.italic?.75:1}}>
                <span>{row.name}</span>
                {row.acctNo && <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--t4)',marginLeft:4,opacity:.6}}>▸</span>}
                {row.sub && <div style={{fontFamily:'var(--mono)',fontSize:8.5,color:'var(--t4)',marginTop:1}}>{row.sub}</div>}
              </div>
              <div style={{height:5,background:'var(--line)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:99,width:`${Math.min(row.pct||0,100)}%`,background:row.color,opacity:row.italic?.6:.8}}/>
              </div>
              <div style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:row.bold?700:500,textAlign:'right',color:row.valColor,fontStyle:row.italic?'italic':'normal'}}>{row.val}</div>
            </div>
          ))}
        </div>

        {cfg.formula && (
          <div style={{padding:'6px 16px',borderTop:'1px solid var(--line)',background:'var(--bg)',fontFamily:'var(--mono)',fontSize:9,color:'var(--t4)',display:'flex',alignItems:'center',gap:6}}>
            <span style={{opacity:.5,fontSize:12}}>ƒ</span>
            <span style={{color:'var(--t2)',fontWeight:500}}>{cfg.formula}</span>
          </div>
        )}
      </div>
    <style>{`@keyframes kdpIn { from { opacity:0; transform:translate(-50%,-50%) scale(.95) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } } @keyframes coaFadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
    </>
  )
}