// src/popup.ts

const themeBtn = document.getElementById('theme-toggle') as HTMLButtonElement | null;

const headerIcon = document.querySelector<HTMLImageElement>('.header img');

function applyTheme(dark: boolean): void {
  document.body.classList.toggle('dark', dark);
  if (themeBtn) themeBtn.textContent = dark ? '☀️' : '🌙';
  if (headerIcon) headerIcon.src = dark ? 'assets/icons-white-100.png' : 'assets/icons-black-100.png';
}

const savedTheme = localStorage.getItem('theme') === 'dark';
applyTheme(savedTheme);

themeBtn?.addEventListener('click', () => {
  const dark = !document.body.classList.contains('dark');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  applyTheme(dark);
});

document.querySelectorAll<HTMLButtonElement>('.acc-header').forEach(header => {
  header.addEventListener('click', () => {
    const item = header.closest('.acc-item');
    if (item) item.classList.toggle('collapsed');
  });
});

const saveBtn = document.getElementById('save') as HTMLButtonElement | null;
const micBtn = document.getElementById('enable-mic') as HTMLButtonElement | null;
const startBtn = document.getElementById('start-rec') as HTMLButtonElement | null;
const stopBtn = document.getElementById('stop-rec') as HTMLButtonElement | null;
const keywordInput = document.getElementById('keyword-input') as HTMLInputElement | null;
const keywordAddBtn = document.getElementById('keyword-add') as HTMLButtonElement | null;
const keywordTagsEl = document.getElementById('keyword-tags') as HTMLDivElement | null;
const keywordEmptyEl = document.getElementById('keyword-empty') as HTMLSpanElement | null;
const autoCaptionsChk = document.getElementById('auto-captions') as HTMLInputElement | null;

const KEYWORDS_KEY = 'keywordAlerts';
const AUTO_CAPTIONS_KEY = 'autoCaptions';

async function loadKeywords(): Promise<string[]> {
  try {
    const res = await chrome.storage.sync.get(KEYWORDS_KEY);
    return Array.isArray(res[KEYWORDS_KEY]) ? res[KEYWORDS_KEY] : [];
  } catch {
    return [];
  }
}

async function saveKeywords(keywords: string[]): Promise<void> {
  await chrome.storage.sync.set({ [KEYWORDS_KEY]: keywords });
}

function renderKeywords(keywords: string[]): void {
  if (!keywordTagsEl || !keywordEmptyEl) return;
  keywordTagsEl.querySelectorAll('.keyword-tag').forEach(el => el.remove());
  keywordEmptyEl.style.display = keywords.length === 0 ? '' : 'none';
  keywords.forEach((kw) => {
    const tag = document.createElement('span');
    tag.className = 'keyword-tag';
    tag.textContent = kw;
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', async () => {
      const current = await loadKeywords();
      const updated = current.filter(k => k !== kw);
      await saveKeywords(updated);
      renderKeywords(updated);
    });
    tag.appendChild(removeBtn);
    keywordTagsEl.appendChild(tag);
  });
}

async function addKeyword(): Promise<void> {
  if (!keywordInput) return;
  const value = keywordInput.value.trim();
  if (!value) return;
  const current = await loadKeywords();
  const lower = value.toLowerCase();
  if (current.map(k => k.toLowerCase()).includes(lower)) {
    keywordInput.value = '';
    return;
  }
  const updated = [...current, value];
  await saveKeywords(updated);
  renderKeywords(updated);
  keywordInput.value = '';
}

keywordAddBtn?.addEventListener('click', addKeyword);
keywordInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addKeyword();
});

void loadKeywords().then(renderKeywords);

async function loadAutoCaptions(): Promise<boolean> {
  try {
    const res = await chrome.storage.sync.get(AUTO_CAPTIONS_KEY);
    return res[AUTO_CAPTIONS_KEY] === true;
  } catch {
    return false;
  }
}

void loadAutoCaptions().then((enabled) => {
  if (autoCaptionsChk) autoCaptionsChk.checked = enabled;
});

autoCaptionsChk?.addEventListener('change', async () => {
  await chrome.storage.sync.set({ [AUTO_CAPTIONS_KEY]: autoCaptionsChk!.checked });
});

function setUI(recording: boolean) {
  if (!startBtn || !stopBtn) return;
  startBtn.disabled = recording;
  stopBtn.disabled = !recording;
}

function toast(msg: string) {
  console.debug('[popup]', msg);
}

// open a full tab to prompt for mic permission
async function openMicSetupTab() {
  await chrome.tabs.create({ url: chrome.runtime.getURL('micsetup.html') });
}

// reflect mic permission state in the button label
async function refreshMicButton() {
  if (!micBtn || !('permissions' in navigator)) return;
  try {
    // @ts-ignore - chrome supports this permission name
    const status = await (navigator as any).permissions.query({ name: 'microphone' });
    const set = () => {
      micBtn.textContent =
        status.state === 'granted'
          ? 'Microphone Enabled ✓'
          : status.state === 'denied'
          ? 'Microphone Blocked'
          : 'Enable Microphone';
      micBtn.disabled = status.state === 'granted';
      micBtn.title =
        status.state === 'granted'
          ? 'Microphone is already enabled for this extension'
          : 'Grant microphone permission so your voice is included in recordings';
    };
    set();
    status.onchange = set;
  } catch {
    // permissions API might not be available
  }
}

// init: read current recording state & update UI
void (async () => {
  try {
    const st = await chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATUS' });
    setUI(!!st?.recording);
  } catch {
    setUI(false);
  }
  refreshMicButton().catch(() => {});
})();

// react to background/offscreen state pings
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'RECORDING_STATE') setUI(!!msg.recording);
  if (msg?.type === 'RECORDING_SAVED') {
    toast(`Saved: ${msg.filename || 'recording.webm'}`);
    setUI(false);
  }
});

// mic permission priming
micBtn?.addEventListener('click', async () => {
  try {
    if ('permissions' in navigator) {
      // @ts-ignore
      const p = await (navigator as any).permissions.query({ name: 'microphone' });
      if (p.state === 'granted') {
        alert('Microphone is already enabled for this extension.');
        await refreshMicButton();
        return;
      }
      if (p.state === 'denied') {
        await openMicSetupTab();
        return;
      }
    }
    // try inline
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
      alert('Microphone enabled for the extension.');
      await refreshMicButton();
    } catch {
      await openMicSetupTab();
    }
  } catch (e) {
    console.error('[popup] mic enable flow error', e);
    alert('Could not open the microphone setup page. Please try again.');
  }
});

// manual transcript download
saveBtn?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const res = await chrome.tabs
    .sendMessage(tab.id, { type: 'GET_TRANSCRIPT' })
    .catch((_e) => {
      toast('No transcript on this page');
      return undefined;
    });

  const transcript = (res as any)?.transcript as string | undefined;
  if (!transcript?.trim()) {
    toast('Transcript is empty');
    return;
  }

  const blob = new Blob([transcript], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const suffix =
    new URL(tab.url ?? 'https://meet.google.com').pathname.split('/').pop() || 'meet-trace';

  chrome.downloads.download(
    { url, filename: `meet-trace-transcript-${suffix}-${Date.now()}.txt`, saveAs: true },
    () => URL.revokeObjectURL(url)
  );
});

let inFlight = false;

// start recording. also resets transcript buffer for a fresh session
startBtn?.addEventListener('click', async () => {
  if (!startBtn || !stopBtn || inFlight) return;
  inFlight = true;
  startBtn.disabled = true;

  try {
    // auto-prime mic if not granted
    if ('permissions' in navigator) {
      try {
        // @ts-ignore
        const status = await (navigator as any).permissions.query({ name: 'microphone' });
        if (status.state !== 'granted') {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach(t => t.stop());
          } catch { 
            // continue with tab-only audio
            }
        }
      } catch { 
        // do nothing
        }
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    // reset transcript buffer so a new meeting starts clean
    await chrome.tabs.sendMessage(tab.id, { type: 'RESET_TRANSCRIPT' }).catch(() => {
      // if not on a Google Meet page yet, the transcript will just be empty later.
    });

    const resp = await chrome.runtime.sendMessage({ type: 'START_RECORDING', tabId: tab.id });
    if (!resp) throw new Error('No response from background');
    if (resp.ok === false) throw new Error(resp.error || 'Failed to start');

    setUI(true);
    toast('Recording started');
  } catch (e: any) {
    console.error('[popup] START_RECORDING error', e);
    setUI(false);
    alert(`Failed to start recording:\n${e?.message || e}`);
  } finally {
    inFlight = false;
  }
});

// stop recording
stopBtn?.addEventListener('click', async () => {
  if (!startBtn || !stopBtn || inFlight) return;
  inFlight = true;
  stopBtn.disabled = true;

  try {
    const resp = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    if (!resp) throw new Error('No response from background');
    if (resp.ok === false) throw new Error(resp.error || 'Failed to stop');
    toast('Stopping… finalizing…');
  } catch (e: any) {
    console.error('[popup] STOP_RECORDING error', e);
    alert(`Failed to stop recording:\n${e?.message || e}`);
    setUI(false);
  } finally {
    inFlight = false;
  }
});
