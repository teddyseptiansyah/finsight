import { useState, useRef, useEffect } from 'react'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const QUARTERS = [
  { id: 'Q1', label: 'Q1', months: ['Jan','Feb','Mar'] },
  { id: 'Q2', label: 'Q2', months: ['Apr','Mei','Jun'] },
  { id: 'Q3', label: 'Q3', months: ['Jul','Agu','Sep'] },
  { id: 'Q4', label: 'Q4', months: ['Okt','Nov','Des'] },
]
const TRIWULAN = [
  { id: 'TW1', label: 'TW-I',   months: ['Jan','Feb','Mar','Apr'] },
  { id: 'TW2', label: 'TW-II',  months: ['Mei','Jun','Jul','Agu'] },
  { id: 'TW3', label: 'TW-III', months: ['Sep','Okt','Nov','Des'] },
]

export function useOutsideClick(ref, handler) {
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) handler() }
    document.addEventListener('click', fn, true)
    return () => document.removeEventListener('click', fn, true)
  }, [ref, handler])
}

export default function PeriodPicker({ allMonths, activeMonths, onChange }) {
  const [open, setOpen]     = useState(false)
  const [draft, setDraft]   = useState(activeMonths)
  const [rangeStart, setRS] = useState(null)
  const ref = useRef()
  useOutsideClick(ref, () => setOpen(false))
  useEffect(() => setDraft(activeMonths), [activeMonths])

  const label = draft.length === allMonths.length ? 'Semua Bulan'
    : draft.length === 1 ? draft[0] : `${draft[0]} – ${draft[draft.length-1]}`

  const isQSel  = q  => { const m=q.months.filter(x=>allMonths.includes(x));  return m.length>0 && m.every(x=>draft.includes(x)) && draft.length===m.length }
  const isTWSel = tw => { const m=tw.months.filter(x=>allMonths.includes(x)); return m.length>0 && m.every(x=>draft.includes(x)) && draft.length===m.length }
  const preset  = ms => { const v=ms.filter(m=>allMonths.includes(m)); setDraft(v.length?v:[allMonths[0]]); setRS(null) }
  const clickM  = m  => {
    if (!rangeStart) { setRS(m); setDraft([m]) }
    else { const [a,b]=[allMonths.indexOf(rangeStart),allMonths.indexOf(m)]; setDraft(allMonths.slice(Math.min(a,b),Math.max(a,b)+1)); setRS(null) }
  }
  const apply = () => { onChange(draft); setOpen(false); setRS(null) }

  return (
    <div className="dd-wrap" ref={ref}>
      <button className={`top-btn${open?' open':''}`} onClick={() => setOpen(o=>!o)}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {label}
        <svg style={{width:9,height:9,transition:'transform .14s',transform:open?'rotate(180deg)':'none'}} viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 2.5l3 3 3-3"/>
        </svg>
      </button>
      {open && (
        <div className="dd-panel pp-panel">
          <div><div className="pp-sec">Tahun</div><div className="pp-chips">
            <button className={`pp-chip${draft.length===allMonths.length?' sel':''}`} onClick={()=>preset(allMonths)}>Semua</button>
          </div></div>
          <div><div className="pp-sec">Kuartal</div><div className="pp-chips">
            {QUARTERS.map(q=><button key={q.id} className={`pp-chip${isQSel(q)?' sel':''}`} disabled={!q.months.some(m=>allMonths.includes(m))} onClick={()=>preset(q.months)}>{q.label}</button>)}
          </div></div>
          <div><div className="pp-sec">Triwulan</div><div className="pp-chips">
            {TRIWULAN.map(tw=><button key={tw.id} className={`pp-chip${isTWSel(tw)?' sel':''}`} disabled={!tw.months.some(m=>allMonths.includes(m))} onClick={()=>preset(tw.months)}>{tw.label}</button>)}
          </div></div>
          <div>
            <div className="pp-sec" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Bulan</span>{rangeStart&&<span className="pp-hint">pilih akhir rentang…</span>}
            </div>
            <div className="pp-mgrid">
              {MONTH_NAMES.map(m=><div key={m} className={`pp-m${draft.includes(m)?' sel':''}${!allMonths.includes(m)?' off':''}`} onClick={()=>allMonths.includes(m)&&clickM(m)}>{m}</div>)}
            </div>
          </div>
          <button className="pp-apply" onClick={apply}>Terapkan</button>
        </div>
      )}
    </div>
  )
}