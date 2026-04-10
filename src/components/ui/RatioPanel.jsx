import { useState, useContext } from 'react'
import { createPortal } from 'react-dom'
import { ACCT, totalOf, lastOf } from '../../lib/parser'
import { fmtFull } from '../../lib/format'
import { CoaContext } from '../../lib/CoaContext'
import LrVisual from '../tabs/LrVisual'
import TabLabRugi from '../tabs/TabLabRugi'

function Section({ title, meta, dot, defaultOpen=true, noPad=false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sec-wrap">
      <button className="sec-header" onClick={() => setOpen(o => !o)}>
        <div className="sec-header-left">
          {dot && <div className="sec-header-dot" style={{background:dot}}/>}
          <span className="sec-header-title">{title}</span>
          {meta && <span className="sec-header-meta">{meta}</span>}
        </div>
        <div className={`sec-arrow${open?' open':''}`}>▶</div>
      </button>
      <div className="sec-body" style={{maxHeight: open ? '9999px' : '0'}}>
        <div className={`sec-body-inner${noPad?' no-pad':''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}

export { Section, WaterfallChart }

function WaterfallChart({ lrData }) {
  const { openCoa } = useContext(CoaContext) || {}
  const rows = lrData?.rows || {}
  const raw  = (no) => totalOf(rows, no)

  const vRev      = raw(ACCT.PENDAPATAN)
  const vHPP      = raw(ACCT.HPP)
  const vLabaKotor = vRev + vHPP
  const vMkt      = raw(ACCT.BIAYA_MKT)
  const vKary     = raw(ACCT.BIAYA_KARY)
  const vGedung   = raw(ACCT.BIAYA_GEDUNG)
  const vUmum     = raw(ACCT.BIAYA_UMUM)
  const vOpsLn    = raw(ACCT.BIAYA_OPS_LN)
  const vOpex     = vMkt + vKary + vGedung + vUmum + vOpsLn
  const vLabaOps  = vLabaKotor + vOpex

  const vSlKurs   = raw(ACCT.SELISIH_KURS)
  const vSlPers   = raw(ACCT.SELISIH_PERS)
  const vSlAT     = raw(ACCT.SELISIH_AT)
  const vAdmBank  = raw(ACCT.ADM_BANK)
  const vPendLain = raw(ACCT.PEND_LAIN)
  const vBiayLain = raw(ACCT.BIAYA_LAIN)
  const vPosLuar  = raw('69999999')
  const vPajak    = raw('80999999')
  const vLaba     = raw(ACCT.LABA_BERSIH)
  const vSblmPajak = vLaba + vPajak

  if (vRev === 0 && vLaba === 0) return null

  const revAbs = Math.abs(vRev) || 1
  const fmt = (v) => fmtFull(Math.abs(v))
  const pct = (v) => (Math.abs(v) / revAbs * 100).toFixed(1) + '%'
  // sign convention: negatif = laba/kredit = hijau, positif = rugi/debit = merah
  const clr = (v) => v < 0 ? 'var(--pos)' : v > 0 ? 'var(--neg)' : 'var(--ink4)'
  const bg  = (v) => v < 0 ? 'rgba(0,180,80,.08)' : v > 0 ? 'rgba(220,50,50,.07)' : 'var(--bg)'
  const barW = (v) => Math.min(Math.abs(v) / revAbs * 100, 100)

  const hasLuar = [vSlKurs, vSlPers, vSlAT, vAdmBank, vPendLain, vBiayLain].some(x => x !== 0)

  // ── Shared card styles ─────────────────────────────────────────
  const cardBase = {
    borderRadius: 10, padding: '12px 14px', background: 'var(--card)',
    border: '1px solid var(--rule)', display: 'flex', flexDirection: 'column',
    gap: 4, position: 'relative', overflow: 'hidden', flex: 1,
    transition: 'transform .12s, box-shadow .12s',
  }
  const resultBase = (val) => ({
    borderRadius: 10, padding: '12px 14px', flex: 1,
    background: bg(val), border: '1px solid ' + clr(val) + '44',
    display: 'flex', flexDirection: 'column', gap: 4,
  })

  const Stripe = ({ color }) => (
    <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:color}}/>
  )
  const Tag = ({ children, color }) => (
    <div style={{fontFamily:'var(--f)',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color: color || 'var(--ink4)'}}>{children}</div>
  )
  const Num = ({ val, color, size=15 }) => (
    <div style={{fontFamily:'var(--f)',fontSize:size,fontWeight:700,letterSpacing:'-.3px',color,lineHeight:1.1}}>{fmt(val)}</div>
  )
  const Sub = ({ children }) => (
    <div style={{fontFamily:'var(--f)',fontSize:10,color:'var(--ink4)'}}>{children}</div>
  )
  const Bar = ({ val, color }) => (
    <div style={{height:3,background:'var(--rule2)',borderRadius:99,overflow:'hidden',marginTop:2}}>
      <div style={{height:'100%',width:barW(val)+'%',background:color,borderRadius:99,transition:'width .4s'}}/>
    </div>
  )

  // Op bubble
  const Op = ({ ch }) => (
    <div style={{
      width:26,height:26,borderRadius:'50%',flexShrink:0,
      border:'1px solid var(--rule2)',background:'var(--surface)',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'var(--f)',fontSize:13,fontWeight:300,color:'var(--ink4)',
    }}>{ch}</div>
  )

  // Vertical arrow with label
  const VArrow = ({ side='right', label }) => {
    const isRight = side === 'right'
    return (
      <div style={{display:'grid',gridTemplateColumns:'2fr 26px 2fr 26px 2fr',gap:8,padding:'1px 0',alignItems:'center'}}>
        {isRight ? <><div/><div/><div/><div/></> : <><div/><div/><div/><div/></>}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,gridColumn: isRight ? 5 : 1}}>
          {label && <div style={{fontFamily:'var(--f)',fontSize:8,color:'var(--ink4)',whiteSpace:'nowrap'}}>{label}</div>}
          <div style={{width:1,height:12,background:'var(--rule2)',position:'relative'}}>
            <div style={{position:'absolute',bottom:-3,left:-3,width:6,height:6,borderRight:'1.5px solid var(--rule2)',borderBottom:'1.5px solid var(--rule2)',transform:'rotate(45deg)'}}/>
          </div>
        </div>
      </div>
    )
  }

  // Clickable card
  const ClickCard = ({ tag, val, sub, color, fillColor, acctNo, prefix, label }) => (
    <div style={{...cardBase,cursor:acctNo?'pointer':'default'}}
      onClick={()=>acctNo&&openCoa?.({acctNo,prefix,color,label})}
      onMouseEnter={e=>{if(acctNo){e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}}}
      onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow=''}}
    >
      <Stripe color={color}/>
      <Tag>{tag}</Tag>
      <Num val={val} color={color}/>
      <Sub>{sub}</Sub>
      <Bar val={val} color={fillColor||color}/>
    </div>
  )

  const ResultCard = ({ tag, val }) => (
    <div style={resultBase(val)}>
      <Tag color={clr(val)}>{tag}</Tag>
      <Num val={val} color={clr(val)}/>
      <Sub style={{color:clr(val),opacity:.7}}>{pct(val)} · {val<=0?'Profit':'Rugi'}</Sub>
    </div>
  )

  // Grid row wrapper — 5 cols: card op card op card
  const Row = ({ children, reverse }) => (
    <div style={{display:'grid',gridTemplateColumns:'1fr 26px 1fr 26px 1fr',alignItems:'center',gap:8}}>
      {children}
    </div>
  )

  // ── Biaya Ops sub-items (small chips) ─────────────────────────
  const opexItems = [
    { label:'Marketing',  val:vMkt,    no:ACCT.BIAYA_MKT,    px:'51' },
    { label:'Karyawan',   val:vKary,   no:ACCT.BIAYA_KARY,   px:'52' },
    { label:'Gedung',     val:vGedung, no:ACCT.BIAYA_GEDUNG,  px:'53' },
    { label:'Umum',       val:vUmum,   no:ACCT.BIAYA_UMUM,   px:'54' },
    ...(vOpsLn!==0?[{label:'Lainnya', val:vOpsLn, no:ACCT.BIAYA_OPS_LN, px:'55'}]:[]),
  ].filter(x => x.val !== 0)

  const luarItems = [
    ...(vSlKurs!==0?[{label:'Selisih Kurs',  val:vSlKurs,   no:ACCT.SELISIH_KURS, px:'61'}]:[]),
    ...(vSlPers!==0?[{label:'Selisih Pers.', val:vSlPers,   no:ACCT.SELISIH_PERS, px:'62'}]:[]),
    ...(vSlAT!==0  ?[{label:'Selisih AT',    val:vSlAT,     no:ACCT.SELISIH_AT,   px:'63'}]:[]),
    ...(vAdmBank!==0?[{label:'Adm. Bank',    val:vAdmBank,  no:ACCT.ADM_BANK,     px:'64'}]:[]),
    ...(vPendLain!==0?[{label:'Pend. Lain',  val:vPendLain, no:ACCT.PEND_LAIN,    px:'651'}]:[]),
    ...(vBiayLain!==0?[{label:'Biaya Lain',  val:vBiayLain, no:ACCT.BIAYA_LAIN,   px:'652'}]:[]),
  ]

  const SmallChip = ({ label, val, no, px }) => (
    <div onClick={()=>no&&openCoa?.({acctNo:no,prefix:px,color:clr(val),label})}
      style={{background:'var(--card)',border:'1px solid var(--rule)',borderRadius:7,padding:'6px 9px',cursor:'pointer',transition:'background .1s',minWidth:80}}
      onMouseEnter={e=>e.currentTarget.style.background='var(--raised)'}
      onMouseLeave={e=>e.currentTarget.style.background='var(--card)'}
    >
      <div style={{fontFamily:'var(--f)',fontSize:8,color:'var(--ink4)',marginBottom:2}}>{label}</div>
      <div style={{fontFamily:'var(--f)',fontSize:11,fontWeight:600,color:clr(val)}}>{fmt(val)}</div>
    </div>
  )

  // Col-5 pass-through ghost (dashed placeholder)
  const Ghost = ({ line1, line2 }) => (
    <div style={{flex:1,borderRadius:10,border:'1.5px dashed var(--rule2)',display:'flex',alignItems:'center',justifyContent:'center',minHeight:64,padding:'8px'}}>
      <span style={{fontFamily:'var(--f)',fontSize:9,color:'var(--ink4)',textAlign:'center',lineHeight:1.6}}>
        {line1}<br/>{line2}
      </span>
    </div>
  )

  return (
    <div style={{padding:'20px 22px 24px',display:'flex',flexDirection:'column',gap:0}}>
      <div style={{fontFamily:'var(--f)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.12em',color:'var(--ink4)',marginBottom:14}}>Income Bridge</div>

      {/* ── ROW 1: Pendapatan − HPP = Laba Kotor ── */}
      <Row>
        <ClickCard tag="Pendapatan Bersih" val={vRev} sub={"100% · Akun 41xxxxxx"}
          color="var(--lime)" acctNo={ACCT.PENDAPATAN} prefix="41" label="Pendapatan Bersih"/>
        <Op ch="−"/>
        <ClickCard tag="Harga Pokok Penjualan" val={vHPP} sub={pct(vHPP)+' dari pendapatan'}
          color="var(--neg)" fillColor="#FCA5A5" acctNo={ACCT.HPP} prefix="42" label="HPP"/>
        <Op ch="="/>
        <ResultCard tag="Laba Kotor" val={vLabaKotor}/>
      </Row>

      {/* Arrow turun dari col-5 (Laba Kotor) */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 26px 1fr 26px 1fr',gap:8}}>
        <div/><div/><div/><div/>
        <div style={{display:'flex',justifyContent:'center',padding:'3px 0'}}>
          <div style={{width:1,height:14,background:'var(--rule2)',position:'relative'}}>
            <div style={{position:'absolute',bottom:-3,left:-3,width:6,height:6,borderRight:'1.5px solid var(--rule2)',borderBottom:'1.5px solid var(--rule2)',transform:'rotate(45deg)'}}/>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Laba Ops = Laba Kotor − Biaya Ops ── (kanan ke kiri) */}
      <Row>
        <ResultCard tag="Laba Operasional" val={vLabaOps}/>
        <Op ch="="/>
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
          <ClickCard tag="Biaya Operasional" val={vOpex} sub={pct(vOpex)+' dari pendapatan'}
            color="var(--warn)" fillColor="#FCD34D" acctNo={ACCT.BIAYA_OPS} prefix="5" label="Biaya Operasional"/>
          {opexItems.length > 0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {opexItems.map((x,i)=><SmallChip key={i} {...x}/>)}
            </div>
          )}
        </div>
        <Op ch="−"/>
        <Ghost line1="← Laba Kotor" line2="dari atas"/>
      </Row>

      {/* Arrow turun dari col-1 (Laba Ops) */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 26px 1fr 26px 1fr',gap:8}}>
        <div style={{display:'flex',justifyContent:'center',padding:'3px 0'}}>
          <div style={{width:1,height:14,background:'var(--rule2)',position:'relative'}}>
            <div style={{position:'absolute',bottom:-3,left:-3,width:6,height:6,borderRight:'1.5px solid var(--rule2)',borderBottom:'1.5px solid var(--rule2)',transform:'rotate(45deg)'}}/>
          </div>
        </div>
      </div>

      {/* ── ROW 3 (opsional): Pos Luar Usaha ── */}
      {hasLuar && (<>
        <Row>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:5}}>
            <div style={{fontFamily:'var(--f)',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:'var(--ink4)'}}>Pos Luar Usaha</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {luarItems.map((x,i)=><SmallChip key={i} {...x}/>)}
            </div>
            <div style={{borderTop:'1px dashed var(--rule2)',paddingTop:5}}>
              <span style={{fontFamily:'var(--f)',fontSize:10,color:clr(vPosLuar),fontWeight:600}}>NET: {fmt(vPosLuar)}</span>
            </div>
          </div>
          <Op ch="±"/>
          <Ghost line1="← Laba Ops" line2="dari atas"/>
          <Op ch="="/>
          <ResultCard tag="Laba Sblm. Pajak" val={vSblmPajak}/>
        </Row>

        {/* Arrow turun dari col-5 (Laba Sblm Pajak) */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 26px 1fr 26px 1fr',gap:8}}>
          <div/><div/><div/><div/>
          <div style={{display:'flex',justifyContent:'center',padding:'3px 0'}}>
            <div style={{width:1,height:14,background:'var(--rule2)',position:'relative'}}>
              <div style={{position:'absolute',bottom:-3,left:-3,width:6,height:6,borderRight:'1.5px solid var(--rule2)',borderBottom:'1.5px solid var(--rule2)',transform:'rotate(45deg)'}}/>
            </div>
          </div>
        </div>
      </>)}

      {/* ── FINAL: Laba Bersih Setelah Pajak ── */}
      <div style={{
        borderRadius:12, padding:'16px 20px', marginTop:2,
        background:bg(vLaba), border:'2px solid '+clr(vLaba)+'55',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          <div style={{fontFamily:'var(--f)',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',color:clr(vLaba),opacity:.75}}>
            Laba Bersih Setelah Pajak
          </div>
          <div style={{fontFamily:'var(--f)',fontSize:26,fontWeight:800,letterSpacing:'-.6px',color:clr(vLaba),lineHeight:1}}>
            {fmt(vLaba)}
          </div>
          <div style={{fontFamily:'var(--f)',fontSize:10,color:clr(vLaba),opacity:.6}}>
            NM {pct(vLaba)} · Akun 89xxxxxx
            {vPajak !== 0 && <span style={{marginLeft:10}}>Sblm Pajak: {fmt(vSblmPajak)}</span>}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:5,alignItems:'flex-end'}}>
          <div style={{background:clr(vLaba),color:'#fff',fontFamily:'var(--f)',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:99,letterSpacing:'.06em'}}>
            {vLaba<=0 ? '✓ LABA' : '✗ RUGI'}
          </div>
          <div style={{fontFamily:'var(--f)',fontSize:10,color:clr(vLaba),opacity:.6,textAlign:'right'}}>
            {barW(vLaba).toFixed(1)}% dari pendapatan
          </div>
        </div>
      </div>
    </div>
  )
}

function RatioPanel({ lrData, neracaData, months, hasNeraca }) {
  const { openCoa } = useContext(CoaContext) || {}
  const lr  = lrData?.rows    || {}
  const neracaMissing = !hasNeraca
  const nrc = neracaData?.rows || {}

  // ── L/R values (raw, tanpa flip) ──────────────────────────────
  const vRev      = totalOf(lr, ACCT.PENDAPATAN)    // negatif (kredit)
  const vHPP      = totalOf(lr, ACCT.HPP)           // positif (debit)
  const vLaba     = totalOf(lr, ACCT.LABA_BERSIH)   // raw 89999999
  const vLabaKotor = vRev + vHPP                    // pendapatan+hpp

  // ── Neraca values (lastOf = saldo akhir periode) ──────────────
  const nAktivaLancar = Math.abs(lastOf(nrc, ACCT.AKTIVA_LANCAR))
  const nHutLancar    = Math.abs(lastOf(nrc, ACCT.HUT_LANCAR))
  const nHutPjp       = Math.abs(lastOf(nrc, ACCT.HUT_PJP))
  const nTotalAktiva  = Math.abs(lastOf(nrc, ACCT.TOTAL_AKTIVA))
  const nEkuitas      = Math.abs(lastOf(nrc, ACCT.EKUITAS))
  const nKas          = Math.abs(lastOf(nrc, ACCT.KAS)) + Math.abs(lastOf(nrc, ACCT.BANK))
  const nPersediaan   = Math.abs(lastOf(nrc, ACCT.PERSEDIAAN))
  const nPiutang      = Math.abs(lastOf(nrc, ACCT.PIU_USAHA))
  const nTotalHutang  = nHutLancar + nHutPjp

  // Display-friendly (semua positif untuk rasio)
  const rev   = Math.abs(vRev)
  const laba  = -vLaba   // flip: untung = positif
  const bruto = -vLabaKotor  // flip: laba kotor positif = untung

  // ── Helper ────────────────────────────────────────────────────
  const ratio = (num, den) => (den > 0 && isFinite(num/den)) ? num/den : null
  const pctOf = (num, den) => (den > 0 && isFinite(num/den)) ? num/den*100 : null
  const fmtR  = (v, dec=2) => v === null ? '—' : v.toFixed(dec) + 'x'
  const fmtP  = (v, dec=1) => v === null ? '—' : v.toFixed(dec) + '%'
  const clrR  = (v, goodAbove=1) => v === null ? 'var(--ink4)' : v >= goodAbove ? 'var(--pos)' : 'var(--neg)'
  const clrP  = (v, goodAbove=0) => v === null ? 'var(--ink4)' : v >= goodAbove ? 'var(--pos)' : 'var(--neg)'
  const barW  = (v, max) => v === null ? 0 : Math.min(Math.abs(v)/max*100, 100)

  // ── RASIO LIKUIDITAS ──────────────────────────────────────────
  const currentRatio = ratio(nAktivaLancar, nHutLancar)
  const quickRatio   = ratio(nAktivaLancar - nPersediaan, nHutLancar)
  const cashRatio    = ratio(nKas, nHutLancar)

  // ── RASIO PROFITABILITAS ──────────────────────────────────────
  const gpm = pctOf(bruto, rev)
  const npm = pctOf(laba,  rev)
  const roe = pctOf(laba,  nEkuitas)

  // ── RASIO SOLVABILITAS ────────────────────────────────────────
  const dar = pctOf(nTotalHutang, nTotalAktiva)
  const der = ratio(nTotalHutang, nEkuitas)

  // ── RASIO AKTIVITAS ───────────────────────────────────────────
  // Receivable Turnover: Penjualan / Rata-rata Piutang
  // (pakai saldo akhir sebagai proxy rata-rata jika hanya 1 periode)
  const recTurnover = ratio(rev, nPiutang)

  // ── Group definitions ─────────────────────────────────────────
  const groups = [
    {
      id: 'likuiditas',
      title: 'Rasio Likuiditas',
      desc: 'Kemampuan membayar kewajiban jangka pendek',
      dot: 'var(--lime)',
      items: [
        {
          label: 'Current Ratio',
          formula: 'Aset Lancar / Liabilitas Lancar',
          value: currentRatio, fmt: fmtR,
          color: clrR(currentRatio, 2),
          bar: barW(currentRatio, 5),
          desc: `AL: ${fmtFull(nAktivaLancar)} · HL: ${fmtFull(nHutLancar)}`,
          good: '≥ 2x', status: currentRatio === null ? null : currentRatio >= 2 ? 'Sehat' : currentRatio >= 1 ? 'Cukup' : 'Kritis',
          coa: { acctNo: ACCT.AKTIVA_LANCAR, prefix:'11', color:'var(--lime)', label:'Aset Lancar' },
        },
        {
          label: 'Quick Ratio',
          formula: '(Aset Lancar − Persediaan) / Liabilitas Lancar',
          value: quickRatio, fmt: fmtR,
          color: clrR(quickRatio, 1),
          bar: barW(quickRatio, 5),
          desc: `Tanpa persediaan ${fmtFull(nPersediaan)}`,
          good: '≥ 1x', status: quickRatio === null ? null : quickRatio >= 1 ? 'Sehat' : 'Perhatian',
          coa: { acctNo: ACCT.AKTIVA_LANCAR, prefix:'11', color:'var(--lime)', label:'Aset Lancar' },
        },
        {
          label: 'Cash Ratio',
          formula: '(Kas + Setara Kas) / Liabilitas Lancar',
          value: cashRatio, fmt: fmtR,
          color: clrR(cashRatio, 0.5),
          bar: barW(cashRatio, 3),
          desc: `Kas+Bank: ${fmtFull(nKas)}`,
          good: '≥ 0.5x', status: cashRatio === null ? null : cashRatio >= 0.5 ? 'Sehat' : 'Perhatian',
          coa: { acctNo: ACCT.KAS, prefix:'110', color:'var(--lime)', label:'Kas & Setara Kas' },
        },
      ],
    },
    {
      id: 'profitabilitas',
      title: 'Rasio Profitabilitas',
      desc: 'Kemampuan menghasilkan laba',
      dot: 'var(--pos)',
      items: [
        {
          label: 'Gross Profit Margin',
          formula: '(Penjualan − HPP) / Penjualan',
          value: gpm, fmt: fmtP,
          color: clrP(gpm, 0),
          bar: barW(gpm, 100),
          desc: `Laba Kotor: ${fmtFull(bruto)}`,
          good: '> 0%', status: gpm === null ? null : gpm > 20 ? 'Baik' : gpm > 0 ? 'Cukup' : 'Rugi',
          coa: { acctNo: ACCT.PENDAPATAN, prefix:'41', color:'var(--pos)', label:'Pendapatan' },
        },
        {
          label: 'Net Profit Margin',
          formula: 'Laba Bersih / Penjualan',
          value: npm, fmt: fmtP,
          color: clrP(npm, 0),
          bar: barW(npm, 50),
          desc: `Laba Bersih: ${fmtFull(laba)}`,
          good: '> 0%', status: npm === null ? null : npm > 5 ? 'Baik' : npm > 0 ? 'Cukup' : 'Rugi',
          coa: { acctNo: ACCT.LABA_BERSIH, prefix:'89', color:'var(--pos)', label:'Laba Bersih' },
        },
        {
          label: 'Return on Equity (ROE)',
          formula: 'Laba Bersih / Modal Sendiri',
          value: roe, fmt: fmtP,
          color: clrP(roe, 0),
          bar: barW(roe, 30),
          desc: `Ekuitas: ${fmtFull(nEkuitas)}`,
          good: '> 0%', status: roe === null ? null : roe > 10 ? 'Baik' : roe > 0 ? 'Cukup' : 'Negatif',
          coa: { acctNo: ACCT.EKUITAS, prefix:'3', color:'var(--pos)', label:'Ekuitas' },
        },
      ],
    },
    {
      id: 'solvabilitas',
      title: 'Rasio Solvabilitas',
      desc: 'Kemampuan memenuhi kewajiban jangka panjang',
      dot: 'var(--warn)',
      items: [
        {
          label: 'Debt to Asset Ratio',
          formula: 'Total Utang / Total Aset',
          value: dar, fmt: fmtP,
          color: dar === null ? 'var(--ink4)' : dar <= 50 ? 'var(--pos)' : dar <= 70 ? 'var(--warn)' : 'var(--neg)',
          bar: barW(dar, 100),
          desc: `Hutang: ${fmtFull(nTotalHutang)} · Aset: ${fmtFull(nTotalAktiva)}`,
          good: '≤ 50%', status: dar === null ? null : dar <= 50 ? 'Sehat' : dar <= 70 ? 'Sedang' : 'Tinggi',
          coa: { acctNo: ACCT.TOTAL_AKTIVA, prefix:'1', color:'var(--warn)', label:'Total Aset' },
        },
        {
          label: 'Debt to Equity (DER)',
          formula: 'Total Utang / Modal Sendiri',
          value: der, fmt: fmtR,
          color: der === null ? 'var(--ink4)' : der <= 1 ? 'var(--pos)' : der <= 2 ? 'var(--warn)' : 'var(--neg)',
          bar: barW(der, 5),
          desc: `Ekuitas: ${fmtFull(nEkuitas)}`,
          good: '≤ 1x', status: der === null ? null : der <= 1 ? 'Sehat' : der <= 2 ? 'Sedang' : 'Tinggi',
          coa: { acctNo: ACCT.EKUITAS, prefix:'3', color:'var(--warn)', label:'Ekuitas' },
        },
      ],
    },
    {
      id: 'aktivitas',
      title: 'Rasio Aktivitas',
      desc: 'Efisiensi penggunaan aset perusahaan',
      dot: 'var(--amber)',
      items: [
        {
          label: 'Receivable Turnover',
          formula: 'Penjualan / Rata-rata Piutang',
          value: recTurnover, fmt: fmtR,
          color: clrR(recTurnover, 4),
          bar: barW(recTurnover, 20),
          desc: `Piutang Usaha: ${fmtFull(nPiutang)}`,
          good: '≥ 4x (makin tinggi makin baik)',
          status: recTurnover === null ? null : recTurnover >= 8 ? 'Baik' : recTurnover >= 4 ? 'Cukup' : 'Lambat',
          coa: { acctNo: ACCT.PIU_USAHA, prefix:'1104', color:'var(--amber)', label:'Piutang Usaha' },
        },
      ],
    },
  ]

  const [activeRatio, setActiveRatio] = useState(null)

  // Flatten semua items dari semua groups
  const allItems = groups.flatMap(g => g.items.map(r => ({ ...r, groupTitle: g.title, groupDot: g.dot })))

  return (
    <>
      {/* ── Banner jika neraca belum diupload */}
      {neracaMissing && (
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'10px 16px', marginBottom:8,
          background:'var(--warn-dim)', border:'1px solid var(--warn)',
          borderRadius:10,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{fontFamily:'Arial, sans-serif', fontSize:12, color:'var(--warn)', fontWeight:600}}>
            File Neraca belum diupload — rasio Likuiditas, Solvabilitas, dan Aktivitas tidak tersedia.
          </span>
        </div>
      )}

      {/* ── Modal detail di tengah layar ── */}
      {activeRatio && createPortal(
        <div
          onClick={() => setActiveRatio(null)}
          style={{
            position:'fixed', inset:0, zIndex:1000,
            background:'rgba(13,13,11,.6)', backdropFilter:'blur(4px)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:420, background:'var(--panel)',
              border:'1px solid var(--rule)',
              borderRadius:16,
              boxShadow:'0 24px 64px rgba(0,0,0,.8)',
              animation:'kdpIn .12s cubic-bezier(.2,.8,.3,1) both',
              flexShrink:0,
            }}
          >
            {/* Header */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'var(--card)',borderBottom:'1px solid var(--rule)',borderRadius:'16px 16px 0 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:3,alignSelf:'stretch',background:activeRatio.color,flexShrink:0}}/>
                <div>
                  <div style={{fontFamily:'Arial, sans-serif',fontSize:12,fontWeight:700,color:'var(--t4)',letterSpacing:'.06em',textTransform:'uppercase'}}>{activeRatio.groupTitle}</div>
                  <div style={{fontFamily:'Arial, sans-serif',fontSize:12,fontWeight:700,color:'var(--t1)',marginTop:1}}>{activeRatio.label}</div>
                </div>
              </div>
              <button onClick={() => setActiveRatio(null)} style={{width:24,height:24,border:'1px solid var(--rule)',background:'transparent',cursor:'pointer',fontFamily:'Arial, sans-serif',fontSize:12,color:'var(--t3)',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .12s',borderRadius:6}}
                onMouseEnter={e=>{e.currentTarget.style.background='var(--neg-dim)';e.currentTarget.style.color='var(--neg)';e.currentTarget.style.borderColor='var(--neg)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--t3)';e.currentTarget.style.borderColor='var(--rule)'}}
              >✕</button>
            </div>

            {/* Nilai besar */}
            <div style={{padding:'20px 18px 16px',borderBottom:'1px solid var(--rule)',display:'flex',alignItems:'flex-end',gap:16}}>
              <div style={{fontFamily:'Arial, sans-serif',fontSize:38,fontWeight:700,letterSpacing:'-.04em',lineHeight:1,color:activeRatio.color}}>
                {activeRatio.value === null ? '—' : activeRatio.fmt(activeRatio.value)}
              </div>
              {activeRatio.status && (
                <div style={{paddingBottom:4}}>
                  <div style={{display:'inline-flex',padding:'2px 8px',border:`1px solid ${activeRatio.color}`,color:activeRatio.color,fontFamily:'Arial, sans-serif',fontSize:12,fontWeight:700,letterSpacing:'.1em',marginBottom:4,borderRadius:4,background:`${activeRatio.color}12`}}>
                    {activeRatio.status}
                  </div>
                  <div style={{fontFamily:'Arial, sans-serif',fontSize:12,color:'var(--t4)',letterSpacing:'.04em'}}>Target: {activeRatio.good}</div>
                </div>
              )}
            </div>

            {/* Bar */}
            {activeRatio.value !== null && (
              <div style={{padding:'12px 18px',borderBottom:'1px solid var(--rule)',background:'var(--card)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontFamily:'Arial, sans-serif',fontSize:12,fontWeight:700,color:'var(--t4)',letterSpacing:'.06em',textTransform:'uppercase'}}>Posisi</span>
                  <span style={{fontFamily:'Arial, sans-serif',fontSize:12,color:'var(--t3)'}}>{activeRatio.bar.toFixed(0)}% dari max</span>
                </div>
                <div style={{height:6,background:'var(--rule)',borderRadius:3}}>
                  <div style={{height:'100%',width:`${activeRatio.bar}%`,background:activeRatio.color,transition:'width .4s ease'}}/>
                </div>
              </div>
            )}

            {/* Detail rows */}
            <div style={{padding:'12px 18px',display:'flex',flexDirection:'column',gap:8}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontFamily:'Arial, sans-serif',fontSize:12,fontWeight:700,color:'var(--t4)',letterSpacing:'.06em',textTransform:'uppercase'}}>Formula</span>
                <span style={{fontFamily:'Arial, sans-serif',fontSize:12,color:'var(--t2)',textAlign:'right',maxWidth:240}}>{activeRatio.formula}</span>
              </div>
              <div style={{height:1,background:'var(--rule)'}}/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                <span style={{fontFamily:'Arial, sans-serif',fontSize:12,fontWeight:700,color:'var(--t4)',letterSpacing:'.06em',textTransform:'uppercase'}}>Data</span>
                <span style={{fontFamily:'Arial, sans-serif',fontSize:12,color:'var(--t3)',textAlign:'right',maxWidth:260}}>{activeRatio.desc}</span>
              </div>
            </div>

            {/* Footer COA link */}
            {activeRatio.coa && (
              <div
                onClick={() => { setActiveRatio(null); openCoa?.(activeRatio.coa) }}
                style={{padding:'10px 18px',borderTop:'1px solid var(--rule)',background:'var(--card)',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',transition:'background .12s',borderRadius:'0 0 16px 16px'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--raised)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--card)'}
              >
                <span style={{fontFamily:'Arial, sans-serif',fontSize:12,color:'var(--t3)',letterSpacing:'.06em'}}>Lihat detail COA →</span>
                <span style={{fontFamily:'Arial, sans-serif',fontSize:12,color:'var(--t4)'}}>{activeRatio.coa.label}</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>

        {/* ── Analisis Rasio — gauge grid ── */}
        <Section title="Analisis Rasio Keuangan" dot="var(--lime)" defaultOpen={true} noPad={true}>
          <div style={{background:'var(--panel)'}}>
            {groups.map((g, gi) => (
              <div key={g.id}>
                {/* Group header */}
                <div style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'8px 16px',
                  background:'var(--surface)',
                  borderBottom:'1px solid var(--rule)',
                  borderTop: gi > 0 ? '1px solid var(--rule)' : 'none',
                }}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:g.dot,flexShrink:0}}/>
                  <span style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:700,color:'var(--t3)',letterSpacing:'.12em',textTransform:'uppercase'}}>{g.title}</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t4)',marginLeft:2}}>{g.desc}</span>
                </div>

                {/* Gauge cards */}
                <div style={{display:'grid', gridTemplateColumns:`repeat(${g.items.length}, 1fr)`}}>
                  {g.items.map((r, i) => {
                    // SVG gauge ring
                    const pct   = Math.min(r.bar, 100)
                    const rad   = 30
                    const circ  = 2 * Math.PI * rad
                    const dash  = circ * (pct / 100)

                    return (
                      <div key={i}
                        onClick={() => setActiveRatio(r)}
                        style={{
                          position:'relative',
                          padding:'20px 16px 18px',
                          borderRight: i < g.items.length-1 ? '1px solid var(--rule)' : 'none',
                          borderBottom:'1px solid var(--rule)',
                          cursor:'pointer',
                          background:'var(--card)',
                          transition:'background .12s',
                          userSelect:'none',
                          display:'flex', alignItems:'center', gap:16,
                        }}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--raised)'}
                        onMouseLeave={e=>e.currentTarget.style.background='var(--card)'}
                      >
                        {/* Gauge circle */}
                        <div style={{position:'relative',flexShrink:0,width:72,height:72}}>
                          <svg viewBox="0 0 72 72" style={{width:72,height:72,transform:'rotate(-90deg)'}}>
                            <circle cx="36" cy="36" r={rad} fill="none" stroke="var(--rule2)" strokeWidth="6"/>
                            <circle cx="36" cy="36" r={rad} fill="none"
                              stroke={r.color} strokeWidth="6"
                              strokeDasharray={`${dash} ${circ}`}
                              strokeLinecap="round"
                              style={{transition:'stroke-dasharray .6s ease'}}
                            />
                          </svg>
                          {/* Center value */}
                          <div style={{
                            position:'absolute', inset:0,
                            display:'flex', flexDirection:'column',
                            alignItems:'center', justifyContent:'center',
                          }}>
                            <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:r.color,lineHeight:1,letterSpacing:'-.02em'}}>
                              {r.value === null ? '—' : r.fmt(r.value)}
                            </span>
                          </div>
                        </div>

                        {/* Text info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontFamily:'var(--mono)',fontSize:9,fontWeight:700,color:'var(--t4)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:6}}>
                            {r.label}
                          </div>
                          {r.status && (
                            <div style={{
                              display:'inline-flex', alignItems:'center',
                              padding:'2px 8px', marginBottom:6,
                              borderRadius:4,
                              border:`1px solid ${r.color}`,
                              background:`color-mix(in srgb, ${r.color} 12%, transparent)`,
                              color:r.color,
                              fontFamily:'var(--mono)', fontSize:9, fontWeight:700, letterSpacing:'.08em',
                            }}>
                              {r.status}
                            </div>
                          )}
                          <div style={{fontFamily:'var(--mono)',fontSize:8.5,color:'var(--t4)',lineHeight:1.5}}>
                            Target: {r.good}
                          </div>
                          {/* Progress bar */}
                          <div style={{height:2,background:'var(--rule2)',borderRadius:1,marginTop:8}}>
                            <div style={{height:'100%',width:`${pct}%`,background:r.color,borderRadius:1,opacity:.7,transition:'width .4s ease'}}/>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </>
  )
}

function LrTab({ filteredLr, filteredNeraca, activeMonths }) {
  const [lrView, setLrView] = useState('visual')

  const toggleStyle = (active) => ({
    fontFamily: 'var(--f)',
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    color: active ? 'var(--ink)' : 'var(--ink4)',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--lime)' : '2px solid transparent',
    padding: '6px 16px',
    cursor: 'pointer',
    letterSpacing: '.04em',
    transition: 'color .1s, border-color .1s',
    marginBottom: -1,
  })

  return (
    <>
      <RatioPanel lrData={filteredLr} neracaData={filteredNeraca} months={activeMonths}/>
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--rule2)',
        borderTop: '2px solid var(--rule2)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 0,
      }}>
        <button style={toggleStyle(lrView==='visual')} onClick={() => setLrView('visual')}>
          ▣ Visual
        </button>
        <button style={toggleStyle(lrView==='detail')} onClick={() => setLrView('detail')}>
          ≡ Detail L/R
        </button>
      </div>
      {lrView === 'visual' ? (
        <Section title="Laba Rugi — Visual" dot="var(--lime)" defaultOpen={true} noPad={false}>
          <LrVisual data={filteredLr} months={activeMonths}/>
        </Section>
      ) : (
        <Section title="Laba Rugi — Detail" dot="var(--lime)" defaultOpen={true} noPad={true}>
          <TabLabRugi data={filteredLr} months={activeMonths}/>
        </Section>
      )}
    </>
  )
}

export default RatioPanel