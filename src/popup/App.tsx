import React, { useEffect, useState, useCallback } from 'react'
import { Mic, MicOff, Square, Circle, Download, Tag, Settings, History, ChevronDown, ChevronUp, X, Plus } from 'lucide-react'

const KEYWORDS_KEY = 'keywordAlerts'
const AUTO_CAPTIONS_KEY = 'autoCaptions'
const AUTO_SAVE_KEY = 'autoSaveTranscripts'

async function loadKeywords(): Promise<string[]> {
  try {
    const res = await chrome.storage.sync.get(KEYWORDS_KEY)
    return Array.isArray(res[KEYWORDS_KEY]) ? res[KEYWORDS_KEY] : []
  } catch { return [] }
}

async function saveKeywords(keywords: string[]): Promise<void> {
  await chrome.storage.sync.set({ [KEYWORDS_KEY]: keywords })
}

export default function App() {
  const [recording, setRecording] = useState(false)
  const [inFlight, setInFlight] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState('')
  const [autoCaptions, setAutoCaptions] = useState(false)
  const [autoSave, setAutoSave] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [micState, setMicState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown')
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' })
      .then(st => setRecording(!!st?.recording))
      .catch(() => setRecording(false))

    loadKeywords().then(setKeywords)

    chrome.storage.sync.get([AUTO_CAPTIONS_KEY, AUTO_SAVE_KEY]).then(res => {
      setAutoCaptions(res[AUTO_CAPTIONS_KEY] === true)
      setAutoSave(res[AUTO_SAVE_KEY] !== false)
    }).catch(() => {})

    refreshMicState()

    const listener = (msg: any) => {
      if (msg?.type === 'RECORDING_STATE') setRecording(!!msg.recording)
      if (msg?.type === 'RECORDING_SAVED') setRecording(false)
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  async function refreshMicState() {
    try {
      const status = await (navigator as any).permissions.query({ name: 'microphone' })
      setMicState(status.state)
      status.onchange = () => setMicState(status.state)
    } catch { setMicState('unknown') }
  }

  async function handleStart() {
    if (inFlight) return
    setInFlight(true)
    try {
      if (micState !== 'granted') {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true })
          s.getTracks().forEach(t => t.stop())
          await refreshMicState()
        } catch {}
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab')
      await chrome.tabs.sendMessage(tab.id, { type: 'RESET_TRANSCRIPT' }).catch(() => {})
      const resp = await chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId: tab.id })
      if (resp?.ok === false) throw new Error(resp.error || 'Failed to start')
      setRecording(true)
    } catch (e: any) {
      alert(`Failed to start recording:\n${e?.message || e}`)
      setRecording(false)
    } finally {
      setInFlight(false)
    }
  }

  async function handleStop() {
    if (inFlight) return
    setInFlight(true)
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' })
      if (resp?.ok === false) throw new Error(resp.error || 'Failed to stop')
    } catch (e: any) {
      alert(`Failed to stop recording:\n${e?.message || e}`)
      setRecording(false)
    } finally {
      setInFlight(false)
    }
  }

  async function handleDownloadTranscript() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TRANSCRIPT' }).catch(() => undefined)
    const transcript = (res as any)?.transcript as string | undefined
    if (!transcript?.trim()) { alert('Transcript is empty'); return }
    const blob = new Blob([transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const suffix = new URL(tab.url ?? 'https://meet.google.com').pathname.split('/').pop() || 'meet-trace'
    chrome.downloads.download({ url, filename: `meet-trace-transcript-${suffix}-${Date.now()}.txt`, saveAs: true }, () => URL.revokeObjectURL(url))
  }

  async function handleAddKeyword() {
    const val = kwInput.trim()
    if (!val) return
    const current = await loadKeywords()
    if (current.map(k => k.toLowerCase()).includes(val.toLowerCase())) { setKwInput(''); return }
    const updated = [...current, val]
    await saveKeywords(updated)
    setKeywords(updated)
    setKwInput('')
  }

  async function handleRemoveKeyword(kw: string) {
    const current = await loadKeywords()
    const updated = current.filter(k => k !== kw)
    await saveKeywords(updated)
    setKeywords(updated)
  }

  async function handleAutoCaptionsChange(checked: boolean) {
    setAutoCaptions(checked)
    await chrome.storage.sync.set({ [AUTO_CAPTIONS_KEY]: checked })
  }

  async function handleAutoSaveChange(checked: boolean) {
    setAutoSave(checked)
    await chrome.storage.sync.set({ [AUTO_SAVE_KEY]: checked })
  }

  async function handleMicClick() {
    try {
      if (micState === 'granted') { alert('Microphone is already enabled for this extension.'); return }
      if (micState === 'denied') { await chrome.tabs.create({ url: chrome.runtime.getURL('micsetup.html') }); return }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        s.getTracks().forEach(t => t.stop())
        alert('Microphone enabled for the extension.')
        await refreshMicState()
      } catch { await chrome.tabs.create({ url: chrome.runtime.getURL('micsetup.html') }) }
    } catch (e) { console.error('[popup] mic flow error', e) }
  }

  const openHistory = useCallback(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') })
  }, [])

  return (
    <div className={`w-72 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans select-none`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <img src="assets/icons-black-100.png" alt="MeetTrace" className="w-6 h-6 dark:hidden" />
          <img src="assets/icons-white-100.png" alt="MeetTrace" className="w-6 h-6 hidden dark:block" />
          <span className="font-semibold text-base">MeetTrace</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openHistory}
            title="Call History"
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            <History size={16} />
          </button>
          {/* <button
            onClick={() => setDark(d => !d)}
            title="Toggle theme"
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm"
          >
            {dark ? '☀️' : '🌙'}
          </button> */}
        </div>
      </div>

      {/* Recording controls */}
      {/* <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Recording</p>
        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={recording || inFlight}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Circle size={14} className={recording ? 'fill-red-400 text-red-400 animate-pulse' : ''} />
            {recording ? 'Recording…' : 'Start'}
          </button>
          <button
            onClick={handleStop}
            disabled={!recording || inFlight}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Square size={14} />
            Stop
          </button>
        </div>
      </div> */}

      {/* Transcript download */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleDownloadTranscript}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Download size={14} />
          Download Transcript
        </button>
      </div>

      {/* Keyword alerts */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Keyword Alerts</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={kwInput}
            onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
            placeholder="Enter keyword"
            className="flex-1 text-sm px-2.5 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddKeyword}
            className="p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[10px] max-h-13 overflow-y-auto">
          {keywords.length === 0 ? (
            <span className="text-xs text-gray-400 dark:text-gray-500">No keywords set</span>
          ) : keywords.map(kw => (
            <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {kw}
              <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-red-500 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Settings accordion */}
      <div className="px-4 py-2">
        <button
          onClick={() => setSettingsOpen(o => !o)}
          className="w-full flex items-center justify-between py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <span className="flex items-center gap-1.5"><Settings size={12} /> Settings</span>
          {settingsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {settingsOpen && (
          <div className="mt-2 space-y-3 pb-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-enable captions on join</span>
              <div
                onClick={() => handleAutoCaptionsChange(!autoCaptions)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${autoCaptions ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoCaptions ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-save transcripts to history</span>
              <div
                onClick={() => handleAutoSaveChange(!autoSave)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${autoSave ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoSave ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </label>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
              <button
                onClick={handleMicClick}
                disabled={micState === 'granted'}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {micState === 'granted' ? <Mic size={14} className="text-green-500" /> : <MicOff size={14} />}
                {micState === 'granted' ? 'Microphone Enabled ✓' : micState === 'denied' ? 'Microphone Blocked' : 'Enable Microphone'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
