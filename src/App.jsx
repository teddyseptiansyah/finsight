import { useState, useCallback } from 'react'
import {
  parseSheet, parseBalanceSheet,
  readWorkbook, readWorkbookNeraca,
  makeDemoData, guessSheet,
} from './lib/parser'
import UploadScreen from './components/UploadScreen'
import Dashboard from './components/Dashboard'

const LR_TYPES = ['lr', 'piutang', 'ak', 'budget']

export default function App() {
  const [data, setData]     = useState(null)
  const [screen, setScreen] = useState('upload')

  const handleDemo = useCallback(() => {
    const raw    = makeDemoData()
    const parsed = {}
    LR_TYPES.forEach(t => { parsed[t] = parseSheet(raw[t]) })
    parsed.neraca = parseBalanceSheet(raw.neraca)
    setData(parsed)
    setScreen('dashboard')
  }, [])

  // lrPayload  = { buffer, sheetMap }
  // nrcPayload = { buffer, sheetMap } | null
  const handleFiles = useCallback((lrPayload, nrcPayload) => {
    const parsed = {}

    const wbLr = readWorkbook(lrPayload.buffer)
    LR_TYPES.forEach(t => {
      const sn = lrPayload.sheetMap[t] || guessSheet(wbLr.sheetNames, t)
      parsed[t] = wbLr.sheets[sn]?.parsed || { months: [], rows: {}, rawRows: [] }
    })

    if (nrcPayload) {
      const wbNrc = readWorkbookNeraca(nrcPayload.buffer)
      const sn    = nrcPayload.sheetMap['neraca'] || guessSheet(wbNrc.sheetNames, 'neraca')
      parsed.neraca = wbNrc.sheets[sn]?.parsed || { months: [], rows: {}, rawRows: [], isBalanceSheet: true }
    } else {
      parsed.neraca = { months: [], rows: {}, rawRows: [], isBalanceSheet: true }
    }

    setData(parsed)
    setScreen('dashboard')
  }, [])

  const handleReset = useCallback(() => { setData(null); setScreen('upload') }, [])

  return screen === 'upload'
    ? <UploadScreen onFiles={handleFiles} onDemo={handleDemo} />
    : <Dashboard data={data} onReset={handleReset} />
}