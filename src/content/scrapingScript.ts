let transcript: string[] = []
let activeKeywords: string[] = []

const KW_STORAGE_KEY = 'keywordAlerts'
const AUTO_CAPTIONS_STORAGE_KEY = 'autoCaptions'

let autoCaptionsEnabled = false
let autoCaptionsTriggered = false

chrome.storage.sync.get(AUTO_CAPTIONS_STORAGE_KEY, (res) => {
  autoCaptionsEnabled = res[AUTO_CAPTIONS_STORAGE_KEY] === true
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && AUTO_CAPTIONS_STORAGE_KEY in changes) {
    autoCaptionsEnabled = changes[AUTO_CAPTIONS_STORAGE_KEY].newValue === true
  }
})

function tryClickCaptionsButton(): boolean {
  const btn = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Turn on captions"], button[aria-label="Увімкнути субтитри"], button[aria-label="Включить субтитры"], button[aria-label="Activer les sous-titres"], button[aria-label="Untertitel aktivieren"], button[aria-label="Activar subtítulos"], button[aria-label="Ativar legendas"]'
  )
  if (btn) {
    btn.click()
    console.debug('[scrapingScript] Auto-enabled captions')
    return true
  }
  return false
}

const captionsButtonObserver = new MutationObserver(() => {
  if (!autoCaptionsEnabled || autoCaptionsTriggered) return
  if (tryClickCaptionsButton()) {
    autoCaptionsTriggered = true
    captionsButtonObserver.disconnect()
  }
})

captionsButtonObserver.observe(document.body, { childList: true, subtree: true })

// ------------------------------------------

function loadKeywordsFromStorage(): void {
  chrome.storage.sync.get(KW_STORAGE_KEY, (res) => {
    activeKeywords = Array.isArray(res[KW_STORAGE_KEY]) ? res[KW_STORAGE_KEY] : []
  })
}

loadKeywordsFromStorage()

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[KW_STORAGE_KEY]) {
    activeKeywords = Array.isArray(changes[KW_STORAGE_KEY].newValue)
      ? changes[KW_STORAGE_KEY].newValue
      : []
  }
})

interface Chunk {
  startTime: number
  endTime: number
  speaker: string
  text: string
}
type OpenChunk = Chunk & { timer: number }

const CHUNK_GRACE_MS = 2000

const prior = new Map<string, OpenChunk>()
const lastSeen = new Map<string, string>()
const lastCommitted = new Map<string, string>()

const normalize = (pre: string) =>
  pre.toLowerCase().replace(/[.,?!'"\u2019]/g, "").replace(/\s+/g, " ").trim()

function handleCaption(speakerKey: string, speakerName: string, rawText: string){
  const text = rawText.trim()
  if(!text) return

  const norm = normalize(text)
  const prev = lastSeen.get(speakerKey)
  if (prev === norm) return
  lastSeen.set(speakerKey, norm)

  console.debug(`[caption] ${speakerName}: ${text}`)

  const lastWord = text.trim().split(/\s+/).pop() ?? ''
  const lastWordLower = lastWord.toLowerCase()
  for (const kw of activeKeywords) {
    if (lastWordLower.includes(kw.toLowerCase())) {
      console.debug(`[include keyword] ${kw}: ${lastWord}`)
      chrome.runtime.sendMessage({ type: 'KEYWORD_FOUND', word: kw, speaker: speakerName, text })
      break
    }
  }

  const now = Date.now()
  const existing = prior.get(speakerKey)

  if (!existing){
    const prevCommit = lastCommitted.get(speakerKey) ?? ''
    const newText = stripPrefix(text, prevCommit)
    if (!newText) return
    const timer = window.setTimeout(() => commit(speakerKey), CHUNK_GRACE_MS)
    prior.set(speakerKey, {
      startTime: now,
      endTime: now,
      speaker: speakerName,
      text: newText,
      timer
    })
    return
  }

  existing.endTime = now
  const prevCommit = lastCommitted.get(speakerKey) ?? ''
  existing.text = stripPrefix(text, prevCommit) || existing.text
  existing.speaker = speakerName

  clearTimeout(existing.timer)
  existing.timer = window.setTimeout(() => commit(speakerKey), CHUNK_GRACE_MS)
}

function stripPrefix(text: string, prefix: string): string {
  if (!prefix) return text
  const normText = normalize(text)
  const normPrefix = normalize(prefix)
  if (normText.startsWith(normPrefix)) {
    const stripped = text.slice(prefix.length).replace(/^[\s,.:;]+/, '').trim()
    return stripped
  }
  return text
}

function commit(key: string){
  const entry = prior.get(key)
  if(!entry) return

  const startTS = new Date(entry.startTime).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const line = `[${startTS}] ${entry.speaker}: ${entry.text}`.trim()
  transcript.push(line)
  lastCommitted.set(key, entry.text)
  console.debug(`[transcript committed] ${line}`)
  clearTimeout(entry.timer)
  prior.delete(key)
}

let captionSelector = '.ygicle'
let speakerSelector = '.NWpY1d'
let captionParent  = '.nMcdL'

let captionObserver: MutationObserver | null = null

function scanClasses(cl: HTMLElement){
  const txtNode = cl.querySelector<HTMLDivElement>(captionSelector)
  if(!txtNode) return

  const speakerName = cl.querySelector<HTMLElement>(speakerSelector)?.textContent?.trim() ?? ' '
  const key = cl.getAttribute('data-participant-id') || speakerName

  const push = () => {
    const trimmed = txtNode.textContent?.trim() ?? ''
    if(trimmed) handleCaption(key, speakerName, trimmed)
  }

  push()

  new MutationObserver(push).observe(txtNode, { childList: true, subtree: true, characterData: true })
}

function launchAttachObserver(region: HTMLElement) {
  captionObserver?.disconnect()

  captionObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && node.matches(captionParent)) {
          scanClasses(node)
        }
      })
    })
  })

  captionObserver.observe(region, { childList: true, subtree: true })
  console.debug(`Caption observer attached`)
  region.querySelectorAll<HTMLElement>(captionParent).forEach(scanClasses)
}

const CAPTION_REGION_LABELS = ['Captions', 'Субтитри', 'Субтитры', 'Légendes', 'Untertitel', 'Subtítulos', 'Legendas']

function findCaptionRegion(): HTMLElement | null {
  for (const label of CAPTION_REGION_LABELS) {
    const el = document.querySelector<HTMLElement>(`div[role="region"][aria-label="${label}"]`)
    if (el) return el
  }
  return null
}

let regionAttached = false

new MutationObserver(() => {
  if (regionAttached) return
  const region = findCaptionRegion()
  if (region) {
    regionAttached = true
    launchAttachObserver(region)
  }
}).observe(document.body, { childList: true, subtree: true })

;(window as any).getTranscript = () => {
    [...prior.keys()].forEach(commit)
    return transcript.join("\n")
  }
  
  ;(window as any).resetTranscript = () => {
    prior.clear()
    lastSeen.clear()
    lastCommitted.clear()
    transcript.length = 0
  }
  
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'GET_TRANSCRIPT') {
      ;[...prior.keys()].forEach(commit)
      sendResponse({ transcript: transcript.join('\n') })
      return true
    }
    if (msg?.type === 'RESET_TRANSCRIPT') {
      prior.clear()
      lastSeen.clear()
      lastCommitted.clear()
      transcript.length = 0
      sendResponse({ ok: true })
      return true
    }
  })

console.debug('Transcript collector ready')
