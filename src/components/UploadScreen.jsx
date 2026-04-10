import { useState, useRef, useCallback } from 'react'
import { guessSheet } from '../lib/parser'
import * as XLSX from 'xlsx'
import s from './UploadScreen.module.css'

const LR_SHEETS = [
  { key: 'lr',      label: 'Laba Rugi',  sub: 'Net Change · Income Statement', color: '#E8623A' },
  { key: 'piutang', label: 'Piutang',    sub: 'Accounts Receivable',           color: '#C98A2A' },
  { key: 'ak',      label: 'Arus Kas',   sub: 'Cash Flow Statement',           color: '#8B5CF6' },
  { key: 'budget',  label: 'Budget',     sub: 'Anggaran Tahunan',              color: '#DC4B4B' },
]
const NRC_SHEETS = [
  { key: 'neraca',  label: 'Neraca',     sub: 'Balance at Date · Posisi Keuangan', color: '#3D9970' },
]

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    style={{ color: 'var(--text3)' }}>
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="#3D9970" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

function FileSlot({ label, sublabel, badge, badgeClass, reports, onLoaded }) {
  const [wb,       setWb]       = useState(null)
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [sheetMap, setSheetMap] = useState({})
  const [buffer,   setBuffer]   = useState(null)
  const inputRef = useRef()

  const loadFile = useCallback((file) => {
    if (!file) return
    setLoading(true)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const buf = e.target.result
      const workbook = XLSX.read(buf, { type: 'array' })
      const map = {}
      reports.forEach(r => {
        map[r.key] = guessSheet(workbook.SheetNames, r.key) || workbook.SheetNames[0]
      })
      setBuffer(buf); setWb(workbook); setSheetMap(map); setLoading(false)
      onLoaded({ buffer: buf, sheetMap: map, wb: workbook })
    }
    reader.readAsArrayBuffer(file)
  }, [reports, onLoaded])

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) loadFile(f)
  }, [loadFile])

  const updateMap = (key, val) => {
    const next = { ...sheetMap, [key]: val }
    setSheetMap(next)
    onLoaded({ buffer, sheetMap: next, wb })
  }

  const clearFile = () => {
    setWb(null); setFileName(''); setSheetMap({}); setBuffer(null)
    if (inputRef.current) inputRef.current.value = ''
    onLoaded(null)
  }

  return (
    <div className={`${s.slotCard} ${wb ? s.slotCardLoaded : ''}`}>
      <div className={s.slotHeader}>
        <div className={s.slotDot} style={{ background: reports[0]?.color }} />
        <div className={s.slotMeta}>
          <div className={s.slotLabel}>{label}</div>
          <div className={s.slotSub}>{sublabel}</div>
        </div>
        <span className={`${s.badge} ${s[badgeClass]}`}>{badge}</span>
      </div>

      {!wb && (
        <div
          className={`${s.dropZone} ${dragging ? s.dropZoneDrag : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls"
            className={s.fileInput} onChange={e => loadFile(e.target.files[0])} />
          <div className={s.dropIconWrap}>
            {loading ? <div className={s.spinner} /> : <UploadIcon />}
          </div>
          <div className={s.dropLabel}>{loading ? 'Memuat…' : 'Drop file di sini'}</div>
          <div className={s.dropHint}>
            {loading ? 'Membaca sheet…' : 'atau klik untuk browse · .xlsx / .xls'}
          </div>
        </div>
      )}

      {wb && (
        <div className={s.fileLoaded}>
          <div className={s.fileIconWrap}><CheckIcon /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={s.fileName}>{fileName}</div>
            <div className={s.fileSheets}>{wb.SheetNames.length} sheet ditemukan</div>
          </div>
          <button className={s.clearBtn} onClick={clearFile}>×</button>
        </div>
      )}

      {wb && (
        <div className={s.sheetMap}>
          <div className={s.sheetMapTitle}>Pilih Sheet</div>
          {reports.map(r => (
            <div key={r.key} className={s.sheetRow}>
              <div className={s.sheetDot} style={{ background: r.color }} />
              <div className={s.sheetName}>{r.label}</div>
              <select
                className={s.sheetSelect}
                value={sheetMap[r.key] || ''}
                onChange={e => updateMap(r.key, e.target.value)}
              >
                {wb.SheetNames.map(sn => <option key={sn} value={sn}>{sn}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UploadScreen({ onFiles, onDemo }) {
  const [lrPayload,  setLrPayload]  = useState(null)
  const [nrcPayload, setNrcPayload] = useState(null)

  const canSubmit = !!lrPayload
  const statusReady = !!lrPayload

  const handleSubmit = () => {
    if (!canSubmit) return
    onFiles(lrPayload, nrcPayload || null)
  }

  return (
    <div className={s.root}>
      <div className={s.glowA} />
      <div className={s.glowB} />

      <header className={s.header}>
        <div className={s.logo}>
          <span className={s.logoMark}>F</span>
          <span className={s.logoText}>IVP <em>FIN 30</em></span>
        </div>
        <span className={s.headerTag}>Navision COA · Financial Intelligence</span>
      </header>

      <main className={s.main}>
        <div className={s.hero}>
          <div className={s.heroEyebrow}>Navision 2014 · SUMIF by No. Akun</div>
          <h1 className={s.heroTitle}>
            Upload data.<br />
            <em>Laporan instan.</em>
          </h1>
          <p className={s.heroSub}>
            Sistem membaca <strong>nomor akun COA</strong> dari kolom A secara otomatis —
            tidak perlu rename header atau konfigurasi apapun.
          </p>
        </div>

        <div className={s.slotsGrid}>
          <FileSlot
            label="File Laba Rugi"
            sublabel="Net Change per bulan · COA standar"
            badge="Wajib"
            badgeClass="badgeRequired"
            reports={LR_SHEETS}
            onLoaded={setLrPayload}
          />
          <FileSlot
            label="File Neraca"
            sublabel="Balance at Date · Posisi Keuangan"
            badge="Opsional"
            badgeClass="badgeOptional"
            reports={NRC_SHEETS}
            onLoaded={setNrcPayload}
          />
        </div>

        <div className={`${s.statusBar} ${statusReady ? s.statusBarReady : ''}`}
          style={{ maxWidth: 560 }}>
          <div className={`${s.statusDot} ${statusReady ? s.statusDotReady : s.statusDotIdle}`} />
          <div>
            <div className={`${s.statusMsg} ${statusReady ? s.statusMsgReady : s.statusMsgIdle}`}>
              {lrPayload
                ? nrcPayload ? 'Kedua file siap — L/R + Neraca' : 'File L/R siap — Neraca tidak diupload'
                : 'Belum ada file yang diupload'}
            </div>
            <div className={s.statusSub}>
              {lrPayload
                ? nrcPayload ? 'Semua tab tersedia termasuk Neraca & Rasio' : 'Tab Neraca & Rasio tidak akan tersedia'
                : 'Upload file Laba Rugi untuk mulai'}
            </div>
          </div>
        </div>

        <div className={s.actions}>
          <button className={s.btnPrimary} disabled={!canSubmit} onClick={handleSubmit}>
            Analisa Sekarang <ArrowIcon />
          </button>
          <button className={s.btnGhost} onClick={onDemo}>
            Coba Data Demo
          </button>
        </div>

        <div className={s.pills}>
          {['L/R terpisah dari Neraca', '2-file upload', 'Balance at Date', 'Zero setup', 'Navision 2014+'].map(p => (
            <span key={p} className={s.pill}>{p}</span>
          ))}
        </div>
      </main>

      <footer className={s.footer}>
        Data diproses sepenuhnya di browser — tidak ada upload ke server.
      </footer>
    </div>
  )
}