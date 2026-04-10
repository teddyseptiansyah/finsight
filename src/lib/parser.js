import * as XLSX from 'xlsx'

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const MONTH_RE = /^(jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)/i

// ── Parse one sheet raw (array-of-arrays) into { months, rows, rawRows }
export function parseSheet(raw) {
  if (!raw || !raw.length) return { months: [], rows: {}, rawRows: [] }

  let headerRow = -1, months = [], monthCols = []
  for (let r = 0; r < Math.min(14, raw.length); r++) {
    const row = raw[r] || []
    const hits = row.reduce((a, c, i) => { if (MONTH_RE.test(String(c || ''))) a.push(i); return a }, [])
    if (hits.length >= 3) {
      headerRow = r
      hits.forEach(i => { months.push(String(raw[r][i])); monthCols.push(i) })
      break
    }
  }
  if (headerRow < 0) return { months: [], rows: {}, rawRows: [] }

  const rows = {}, rawRows = []
  for (let r = headerRow + 1; r < raw.length; r++) {
    const row = raw[r] || []
    const cellA = String(row[0] || '').trim()
    if (!cellA) continue
    const m = cellA.match(/\b(\d{7,9})\b/)
    const no = m ? m[1] : null

    // Ekstrak nama akun — tiga format Navision:
    // Format 1: kolom A = "41000501   NAMA AKUN" (nomor+nama dalam satu sel)
    // Format 2: kolom A = "41000501", kolom sebelum bulan = "NAMA AKUN"
    // Format 3: kolom A = "NAMA AKUN" tanpa nomor
    let name = ''
    const stripped = cellA
      .replace(/^\d{7,9}[\s\t\-_|,;.]*/, '')
      .replace(/^\d+[\s\t]+/, '')
      .trim()
    if (stripped && !/^\d+$/.test(stripped)) {
      // Format 1: ada nama setelah nomor di kolom A
      name = stripped
    } else {
      // Format 2: cari kolom nama — semua kolom sebelum kolom bulan pertama
      // yang berisi teks (bukan angka)
      const firstMonthCol = monthCols[0] || 99
      for (let ci = 1; ci < firstMonthCol; ci++) {
        const cell = String(row[ci] || '').trim()
        // Valid nama: ada isinya, bukan angka murni, bukan nilai bulan
        if (cell && !/^-?[\d,\.\s]+$/.test(cell) && !MONTH_RE.test(cell)) {
          name = cell
          break
        }
      }
    }
    if (!name) name = cellA
    const values = monthCols.map(ci => {
      const v = row[ci]
      if (v == null || v === '' || v === '-' || v === '—') return 0
      const n = parseFloat(String(v).replace(/[,\s]/g, ''))
      return isNaN(n) ? 0 : n
    })
    if (no) rows[no] = values
    rawRows.push({ no, name, values })
  }
  return { months, rows, rawRows }
}

// ── Read workbook from ArrayBuffer, return map of sheetName → parsed
export function readWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const result = { sheetNames: wb.SheetNames, sheets: {} }
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name]
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    result.sheets[name] = { raw, parsed: parseSheet(raw) }
  })
  return result
}

// ── Parse neraca (balance sheet) — kolom = saldo akhir per periode, bukan net change
// Output sama dengan parseSheet tapi semantiknya berbeda:
// rows[acctNo] = array saldo akhir per kolom/periode
export function parseBalanceSheet(raw) {
  const parsed = parseSheet(raw)
  return { ...parsed, isBalanceSheet: true }
}

export function readWorkbookNeraca(buffer) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const result = { sheetNames: wb.SheetNames, sheets: {} }
  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name]
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    result.sheets[name] = { raw, parsed: parseBalanceSheet(raw) }
  })
  return result
}

// ── Helpers
export const totalOf   = (rows, no) => (rows[no] || []).reduce((a, b) => a + b, 0)
export const monthlyOf = (rows, no) => rows[no] || null
export const lastOf    = (rows, no) => { const v = rows[no]; return v ? v[v.length - 1] : 0 }

// ── Find best matching sheet for each report type
const SHEET_HINTS = {
  lr:      ['laba', 'income', 'pl', 'profit'],
  neraca:  ['neraca', 'balance', 'posisi'],
  piutang: ['piutang', 'receivable', 'ar'],
  ak:      ['arus', 'cashflow', 'cash'],
  budget:  ['budget', 'anggaran', 'plan'],
}
export function guessSheet(sheetNames, type) {
  const hints = SHEET_HINTS[type] || []
  return sheetNames.find(s => hints.some(h => s.toLowerCase().includes(h))) || sheetNames[0]
}

// ── COA account map
// Struktur biaya sesuai COA Navision:
//   51xxxxxx  Biaya Marketing
//   52xxxxxx  Biaya Karyawan
//   53xxxxxx  Biaya Gedung & Operasional
//     53000100  Biaya Gedung
//     53000200  Biaya Listrik, Telepon & PAM
//     53000300  Biaya Langganan
//     53000400  Biaya Rumah Tangga
//     53000500  Biaya Rapat
//     53000600  Biaya Pemeliharaan
//   54xxxxxx  Biaya Umum
//     54000100  Biaya Perjalanan Dinas
//     54000200  Biaya Transportasi Non Ops
//     54000300  Biaya Asuransi
//     54000400  Biaya Konsultan
//     54000500  Biaya Pajak
//     54000600  Biaya Depresiasi
//     54000700  Biaya Umum Lainnya
//   55xxxxxx  Biaya Operasional Lainnya
//   59999999  BIAYA OPERASIONAL, TOTAL (51+52+53+54+55)
//   ── Pos luar usaha ──
//   61xxxxxx  Selisih Kurs
//   62xxxxxx  Selisih Persediaan
//   63xxxxxx  Selisih Penjualan Aktiva Tetap
//   64xxxxxx  Administrasi Bank
//   65xxxxxx  Pendapatan & Biaya Lain-lain
//     65100000  Pendapatan Lain-Lain
//     65200000  Biaya Lain-Lain di Luar Usaha
//   69999999  BIAYA OPS + DILUAR USAHA, TOTAL
//   89999999  LABA BERSIH

export const ACCT = {
  // Laba Rugi — summary
  PENDAPATAN:    '41999999',
  HPP:           '42999999',

  // Biaya Operasional per kelompok
  BIAYA_MKT:     '51999999',   // Biaya Marketing total
  BIAYA_KARY:    '52999999',   // Biaya Karyawan total
  BIAYA_GEDUNG:  '53999999',   // Biaya Gedung & Operasional total
  BIAYA_UMUM:    '54999999',   // Biaya Umum total
  BIAYA_OPS_LN:  '55999999',   // Biaya Operasional Lainnya total
  BIAYA_OPS:     '59999999',   // Biaya Operasional, TOTAL (51+52+53+54+55)

  // Pos luar usaha
  SELISIH_KURS:  '61999999',
  SELISIH_PERS:  '62999999',
  SELISIH_AT:    '63999999',
  ADM_BANK:      '64999999',
  PEND_LAIN:     '65199999',   // Pendapatan Lain-Lain (kredit)
  BIAYA_LAIN:    '65299999',   // Biaya Lain-Lain di Luar Usaha
  BEBAN_TOTAL:   '69999999',   // Biaya Ops + Diluar Usaha, TOTAL

  PAJAK:         '80999999',
  LABA_BERSIH:   '89999999',

  // Sub-pendapatan (pie chart)
  REV_SUBS: [
    { no: '41000199', label: 'Audio' },
    { no: '41000299', label: 'Visual' },
    { no: '41000399', label: 'Video' },
    { no: '41000899', label: 'AV Integration' },
    { no: '41001999', label: 'Jasa Service' },
    { no: '41002099', label: 'Jasa Instalasi' },
    { no: '41001299', label: 'Software' },
    { no: '41001399', label: 'IT Hardware' },
    { no: '41000699', label: 'LED Lighting' },
  ],

  // Sub-biaya Operasional (pie chart + drilldown)
  BIAYA_SUBS: [
    { no: '51999999', label: 'Marketing',              prefix: '51' },
    { no: '52999999', label: 'Karyawan',               prefix: '52' },
    { no: '53999999', label: 'Gedung & Operasional',   prefix: '53' },
    { no: '54999999', label: 'Umum',                   prefix: '54' },
    { no: '55999999', label: 'Ops Lainnya',            prefix: '55' },
  ],

  // Biaya Gedung & Operasional detail (53xxxxxx)
  BIAYA_GEDUNG_SUBS: [
    { no: '53000100', label: 'Biaya Gedung' },
    { no: '53000200', label: 'Biaya Listrik, Telepon & PAM' },
    { no: '53000300', label: 'Biaya Langganan' },
    { no: '53000400', label: 'Biaya Rumah Tangga' },
    { no: '53000500', label: 'Biaya Rapat' },
    { no: '53000600', label: 'Biaya Pemeliharaan' },
  ],

  // Biaya Umum detail (54xxxxxx)
  BIAYA_UMUM_SUBS: [
    { no: '54000100', label: 'Biaya Perjalanan Dinas' },
    { no: '54000200', label: 'Biaya Transportasi Non Operasional' },
    { no: '54000300', label: 'Biaya Asuransi' },
    { no: '54000400', label: 'Biaya Konsultan' },
    { no: '54000500', label: 'Biaya Pajak' },
    { no: '54000600', label: 'Biaya Depresiasi' },
    { no: '54000700', label: 'Biaya Umum Lainnya' },
  ],

  // Pos luar usaha detail
  LUAR_USAHA_SUBS: [
    { no: '61999999', label: 'Selisih Kurs',                  prefix: '61' },
    { no: '62999999', label: 'Selisih Persediaan',            prefix: '62' },
    { no: '63999999', label: 'Selisih Penjualan Aktiva Tetap',prefix: '63' },
    { no: '64999999', label: 'Administrasi Bank',             prefix: '64' },
    { no: '65199999', label: 'Pendapatan Lain-Lain',          prefix: '651' },
    { no: '65299999', label: 'Biaya Lain-Lain di Luar Usaha', prefix: '652' },
  ],

  // Neraca
  AKTIVA_LANCAR: '11999999',
  AKTIVA_TETAP:  '12999999',
  AKTIVA_LAIN:   '13999999',
  TOTAL_AKTIVA:  '19999999',
  HUT_LANCAR:    '21999999',
  HUT_PJP:       '22999999',
  EKUITAS:       '39999999',
  KAS:           '11019999',
  BANK:          '11029999',
  PIU_USAHA:     '11049999',
  PERSEDIAAN:    '11089999',

  // Piutang detail
  PIU_DETAIL: [
    { no: '11040001', label: 'Piutang Usaha' },
    { no: '11040005', label: 'Piutang Ditangguhkan' },
    { no: '11060002', label: 'Piutang Karyawan' },
    { no: '11066001', label: 'Piutang Investasi' },
    { no: '11070001', label: 'Piutang MDF' },
    { no: '11070005', label: 'Piutang Pihak III' },
    { no: '11070006', label: 'Piutang Rebate' },
    { no: '11070007', label: 'Piutang Pemegang Saham' },
    { no: '11076001', label: 'Piutang Antar Company' },
  ],

  // Variance comparison
  VAR_ACCOUNTS: [
    { no: '41999999', label: 'Pendapatan Bersih',            isRev: true  },
    { no: '42999999', label: 'Harga Pokok Penjualan',        isRev: false },
    { no: '52999999', label: 'Biaya Karyawan',               isRev: false },
    { no: '51999999', label: 'Biaya Marketing',              isRev: false },
    { no: '53999999', label: 'Biaya Gedung & Operasional',   isRev: false },
    { no: '54999999', label: 'Biaya Umum',                   isRev: false },
    { no: '55999999', label: 'Biaya Operasional Lainnya',    isRev: false },
    { no: '59999999', label: 'Total Biaya Operasional',      isRev: false },
    { no: '69999999', label: 'Total Beban (Ops+Luar Usaha)', isRev: false },
    { no: '89999999', label: 'Laba Bersih',                  isRev: true  },
  ],
}

// ── Generate demo data
export function makeDemoData() {
  const R = (b, n = 0.08) => Math.round(b * (1 + (Math.random() - 0.5) * n))
  const mk = (no, name, ...vals) => [`${no}   ${name}`, ...vals]
  const hdr = ['No. Akun   |   Nama Akun', ...MONTHS]

  const rev   = [520,575,510,640,705,618,665,752,688,782,855,924].map(v => R(v))
  const hpp   = rev.map(v => Math.round(v * 0.57))
  const mkt   = rev.map(v => Math.round(v * 0.04))
  const kary  = rev.map(v => Math.round(v * 0.12))
  // 53 subs
  const g_gd  = rev.map(v => Math.round(v * 0.015))
  const g_ltp = rev.map(v => Math.round(v * 0.010))
  const g_lng = rev.map(v => Math.round(v * 0.005))
  const g_rt  = rev.map(v => Math.round(v * 0.004))
  const g_rpt = rev.map(v => Math.round(v * 0.003))
  const g_pml = rev.map(v => Math.round(v * 0.006))
  const gedung = g_gd.map((v,i) => v+g_ltp[i]+g_lng[i]+g_rt[i]+g_rpt[i]+g_pml[i])
  // 54 subs
  const u_pjl = rev.map(v => Math.round(v * 0.008))
  const u_trn = rev.map(v => Math.round(v * 0.005))
  const u_asu = rev.map(v => Math.round(v * 0.004))
  const u_kon = rev.map(v => Math.round(v * 0.003))
  const u_pjk = rev.map(v => Math.round(v * 0.006))
  const u_dep = rev.map(v => Math.round(v * 0.010))
  const u_ln  = rev.map(v => Math.round(v * 0.004))
  const umum  = u_pjl.map((v,i) => v+u_trn[i]+u_asu[i]+u_kon[i]+u_pjk[i]+u_dep[i]+u_ln[i])
  const opsLn = rev.map(v => Math.round(v * 0.012))
  const tOps  = mkt.map((v,i) => v+kary[i]+gedung[i]+umum[i]+opsLn[i])
  // Luar usaha
  const slKurs = rev.map(v => Math.round(v * 0.003))
  const slPers = rev.map(v => Math.round(v * 0.002))
  const slAT   = MONTHS.map(() => R(5, 0.5))
  const adm    = rev.map(v => Math.round(v * 0.008))
  const pLain  = [8,10,7,12,11,9,10,13,11,14,15,18]
  const bLain  = [3,4,3,5,4,3,4,5,4,5,6,7]
  const tBeban = tOps.map((v,i) => v+slKurs[i]+slPers[i]+slAT[i]+adm[i]-pLain[i]+bLain[i])
  const pajak  = rev.map(v => Math.round(v * 0.025))
  const laba   = rev.map((v,i) => v - hpp[i] - tBeban[i] - pajak[i])

  const aL = rev.map((_, i) => R(2800 + i * 55))
  const aT = [4200,4180,4160,4140,4120,4100,4080,4060,4040,4020,4000,3980]
  const hL = aL.map(v => Math.round(v * 0.38))
  const hP = [1800,1780,1760,1740,1720,1700,1680,1660,1640,1620,1600,1580]
  const ek = aL.map((v, i) => v + aT[i] - hL[i] - hP[i])

  const lr = [hdr,
    mk('41999999','PENDAPATAN BERSIH, TOTAL',...rev),
    mk('41000199','PENJUALAN AUDIO, TOTAL',...rev.map(v=>Math.round(v*.24))),
    mk('41000299','PENJUALAN VISUAL, TOTAL',...rev.map(v=>Math.round(v*.20))),
    mk('41000899','PENJUALAN AVI, TOTAL',...rev.map(v=>Math.round(v*.18))),
    mk('41001999','PENDAPATAN JASA SERVICE, TOTAL',...rev.map(v=>Math.round(v*.14))),
    mk('41002099','PENDAPATAN JASA INSTALASI, TOTAL',...rev.map(v=>Math.round(v*.12))),
    mk('41001299','PENJUALAN SOFTWARE, TOTAL',...rev.map(v=>Math.round(v*.07))),
    mk('41001399','PENJUALAN IT HARDWARE, TOTAL',...rev.map(v=>Math.round(v*.05))),
    mk('42999999','HARGA POKOK PENJUALAN, TOTAL',...hpp),
    mk('51999999','BIAYA MARKETING, TOTAL',...mkt),
    mk('52999999','BIAYA KARYAWAN, TOTAL',...kary),
    mk('53999999','BIAYA GEDUNG & OPERASIONAL, TOTAL',...gedung),
    mk('53000100','Biaya Gedung',...g_gd),
    mk('53000200','Biaya Listrik, Telepon Dan Pam',...g_ltp),
    mk('53000300','Biaya Langganan',...g_lng),
    mk('53000400','Biaya Rumah Tangga',...g_rt),
    mk('53000500','Biaya Rapat',...g_rpt),
    mk('53000600','Biaya Pemeliharaan',...g_pml),
    mk('54999999','BIAYA UMUM, TOTAL',...umum),
    mk('54000100','Biaya Perjalanan Dinas',...u_pjl),
    mk('54000200','Biaya Transportasi Non Operasional',...u_trn),
    mk('54000300','Biaya Asuransi',...u_asu),
    mk('54000400','Biaya Konsultan',...u_kon),
    mk('54000500','Biaya Pajak',...u_pjk),
    mk('54000600','Biaya Depresiasi',...u_dep),
    mk('54000700','Biaya Umum Lainnya',...u_ln),
    mk('55999999','BIAYA OPERASIONAL LAINNYA, TOTAL',...opsLn),
    mk('59999999','BIAYA OPERASIONAL, TOTAL',...tOps),
    mk('61999999','SELISIH KURS, TOTAL',...slKurs),
    mk('62999999','SELISIH PERSEDIAAN, TOTAL',...slPers),
    mk('63999999','SELISIH PENJUALAN AKTIVA TETAP, TOTAL',...slAT),
    mk('64999999','ADMINISTRASI BANK, TOTAL',...adm),
    mk('65199999','PENDAPATAN LAIN-LAIN, TOTAL',...pLain),
    mk('65299999','BIAYA LAIN-LAIN DI LUAR USAHA, TOTAL',...bLain),
    mk('69999999','BIAYA OPERASIONAL, PENDAPATAN & BIAYA DILUAR USAHA, TOTAL',...tBeban),
    mk('80999999','PAJAK PENGHASILAN, TOTAL',...pajak),
    mk('89999999','LABA BERSIH SETELAH PAJAK',...laba),
  ]

  const neraca = [hdr,
    mk('19999999','AKTIVA, TOTAL',...aL.map((v,i)=>v+aT[i])),
    mk('11999999','AKTIVA LANCAR, TOTAL',...aL),
    mk('11019999','KAS, TOTAL',...aL.map(v=>Math.round(v*.22))),
    mk('11029999','BANK OPERASIONAL, TOTAL',...aL.map(v=>Math.round(v*.28))),
    mk('11049999','PIUTANG USAHA, TOTAL',...aL.map(v=>Math.round(v*.30))),
    mk('11089999','PERSEDIAAN,TOTAL',...aL.map(v=>Math.round(v*.15))),
    mk('12999999','AKTIVA TETAP, TOTAL',...aT),
    mk('13999999','AKTIVA LAIN-LAIN, TOTAL',...MONTHS.map(()=>120)),
    mk('21999999','KEWAJIBAN LANCAR, TOTAL',...hL),
    mk('22999999','KEWAJIBAN JANGKA PANJANG, TOTAL',...hP),
    mk('39999999',"STOCKHOLDER'S EQUITY, TOTAL",...ek),
  ]

  const pBase = b => MONTHS.map((_, i) => R(b + i * 4))
  const piutang = [hdr,
    mk('11040001','Piutang Usaha',...pBase(420)),
    mk('11040005','Piutang Ditangguhkan',...pBase(80)),
    mk('11060002','Piutang Karyawan',...pBase(45)),
    mk('11066001','Piutang Investasi',...pBase(120)),
    mk('11070001','Piutang MDF',...pBase(65)),
    mk('11070005','Piutang Pihak III',...pBase(90)),
    mk('11076001','Piutang Antar Company',...pBase(200)),
  ]

  const kOp  = rev.map(v => Math.round(v * .18))
  const kInv = rev.map(v => -Math.round(v * .04))
  const kPd  = MONTHS.map((_, i) => i % 3 === 0 ? -80 : -20)
  const ak = [hdr,
    mk('A.OP','SUBTOTAL KAS OPERASI',...kOp),
    mk('B.INV','SUBTOTAL KAS INVESTASI',...kInv),
    mk('C.PD','SUBTOTAL KAS PENDANAAN',...kPd),
    mk('D.AWAL','Saldo Awal Periode',...MONTHS.map((_,i)=>i===0?500:0)),
  ]

  const budget = [hdr,
    mk('41999999','PENDAPATAN BERSIH',...rev.map(v=>Math.round(v*1.07))),
    mk('42999999','HARGA POKOK PENJUALAN',...hpp.map(v=>Math.round(v*1.06))),
    mk('51999999','BIAYA MARKETING',...mkt.map(v=>Math.round(v*1.10))),
    mk('52999999','BIAYA KARYAWAN',...kary.map(v=>Math.round(v*1.08))),
    mk('53999999','BIAYA GEDUNG & OPERASIONAL',...gedung.map(v=>Math.round(v*1.05))),
    mk('54999999','BIAYA UMUM',...umum.map(v=>Math.round(v*1.05))),
    mk('55999999','BIAYA OPERASIONAL LAINNYA',...opsLn.map(v=>Math.round(v*1.05))),
    mk('59999999','BIAYA OPERASIONAL',...tOps.map(v=>Math.round(v*1.07))),
    mk('89999999','LABA BERSIH SETELAH PAJAK',...laba.map(v=>Math.round(v*1.14))),
  ]

  return { lr, neraca, piutang, ak, budget }
}