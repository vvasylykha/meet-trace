# MeetTrace (Chrome Extension)

Scrape live captions from a Google Meet and save them as a `.txt` transcript, or record the current Google Meet tab (video + audio) to a `.webm` file. Optionally, mix in your microphone so your own voice is included in the recording. Set keyword alerts to get a desktop notification whenever a specific word is spoken.

## Features

**Transcript saver** – parses Google Meet's live captions and downloads a clean timestamped `.txt` file. Duplicate/incremental caption text is automatically deduplicated so each line contains only new speech.

**Keyword alerts** – define a list of keywords; whenever one is detected in live captions a Chrome desktop notification fires instantly.

**Tab recorder** – captures Google Meet tab video + audio into a `.webm` via MediaRecorder.

**Optional mic mix** – include your microphone in the recording (once you grant permission).

**MV3/Offscreen architecture** – recording runs in a hidden offscreen document to comply with Manifest V3 restrictions.

## How it works (high level)

1. Content script (`scrapingScript.ts`) watches the Google Meet caption DOM, buffers speech chunks per speaker with a 2-second grace period, deduplicates incremental text, and commits finalized lines to the transcript.

2. Popup lets you download the transcript, manage keyword alerts, or control recording.

3. Background service worker creates/coordinates an offscreen document and requests the correct capture `streamId` for the active tab. It also handles `KEYWORD_FOUND` messages and fires Chrome notifications.

4. Offscreen page captures the tab, optionally mixes microphone audio, records, and hands the blob back for download.

## Requirements

**Google Chrome** (or Chromium-based browser) with `Manifest V3` support and the `Offscreen API`.

**Node.js 18+** and **npm** (or **pnpm/yarn**) to build the extension.

The extension uses the following Chrome permissions:
`activeTab`, `downloads`, `tabCapture`, `offscreen`, `storage`, `tabs`, `desktopCapture`, `notifications`
and is scoped to `https://meet.google.com/*`.

## Quick start
1) Clone and install
```
git clone https://github.com/vvasylykha/meet-trace.git
cd meet-trace
npm install
```

2) Build
```
npm run build   # outputs to `./dist`
```

3) Load into Chrome
- Open `chrome://extensions`
- Toggle "Developer mode" (top right)
- Click "Load unpacked"
- Select the `./dist` folder


Open a Google Meet, click the extension icon:
 - **Download Transcript** – saves a `.txt` of the live captions (turn captions ON in Google Meet).
 - **Keyword Alerts** – add words to watch; a desktop notification fires when any is detected.
 - **Enable Microphone** – grants mic permission so your voice can be mixed into recordings.
 - **Start Recording (tab) / Stop & Download** – creates a `.webm` file via the Downloads API.

## Install & build (detailed)

**1. Install Node**
  - macOS: `brew install node`

  - Ubuntu/Debian: `sudo apt-get install -y nodejs npm`

  - Verify: `node -v && npm -v`

**2. Install dependencies**

```
npm install
```


**3. Build once (production)**

```
npm run build
```

This compiles TypeScript via `ts-loader` and copies HTML/CSS/assets/manifest to `dist/`.

**4. Load the extension**

  - Visit `chrome://extensions`
  - Turn on `Developer mode`
  - Click `Load unpacked` → select the `dist` directory that was created inside your repo when you ran `npm run build`

> During development you can also run:
> `npm run watch` which will force a rebuild on file changes (when you save a file)
> After each rebuild, click Reload on the extension (in `chrome://extensions`) to pick up changes. If you changed the service worker or manifest, you must reload the extension; for content script-only changes, a page refresh of the Google Meet tab may be enough.

## Using the extension

1. Open a Google Meet at `https://meet.google.com/...`

2. (For transcripts) turn on **Captions** in Google Meet.

3. Click the extension icon (puzzle → pin it for quick access).

4. In the popup:

  - **Download Transcript**: saves **`meet-trace-transcript-<meeting-id>-<timestamp>.txt`** with one line per speech chunk in the format `[HH:MM:SS] Speaker: text`.
  - **Keyword Alerts**: type a keyword and press Enter (or click Add). A Chrome notification fires whenever that word appears in live captions. Keywords are persisted in `chrome.storage.sync`.
  - **Recording**
      - **Enable Microphone** – click before starting to capture your audio alongside other participants.
        - The mic prompt may not appear reliably in a popup. If so, the button opens a dedicated `Enable Microphone` page (`micsetup.html`) where you can click `Enable` and allow mic access.
        - Once granted, the label changes to `Microphone Enabled`.
      - **Start Recording**: starts a recording of the current tab (video + system audio). If mic is enabled and mixing is on (default), your mic is mixed in.
      - **Stop & Download**: finalizes and downloads `meet-trace-recording-<meeting-id>-<timestamp>.webm`.

> The extension shows a **REC** badge while recording. All files are saved locally via Chrome's Downloads API.

## Transcript format

Each line in the downloaded `.txt` follows this format:

```
[HH:MM:SS] Speaker: text of what was said
```

Google Meet incrementally grows caption text in the DOM. MeetTrace deduplicates this automatically — each committed line contains only the new words spoken since the previous chunk for that speaker.

## Project structure
```
.
├─ manifest.json
├─ webpack.config.js
├─ tsconfig.json
├─ package.json
├─ src/
│  ├─ assets/                  # extension icons and alert image
│  ├─ background/
│  │  └─ background.ts         # MV3 service worker: offscreen lifecycle, stream capture, notifications
│  ├─ content/
│  │  └─ scrapingScript.ts     # caption DOM observer, chunk buffering, deduplication, keyword detection
│  ├─ offscreen/
│  │  ├─ offscreen.html
│  │  └─ offscreen.ts          # MediaRecorder: tab + mic mix, blob → download
│  ├─ popup/
│  │  ├─ popup.html
│  │  ├─ popup.css
│  │  └─ popup.ts              # popup UI: transcript download, keyword alerts, recording controls
│  └─ micsetup/
│     ├─ micsetup.html
│     ├─ micsetup.css
│     └─ micsetup.ts           # dedicated page to request microphone permission
└─ dist/                       # build output (generated by webpack)
```

## Configuration knobs
- Mix microphone into recording:
  - In `src/offscreen/offscreen.ts`:
```
const WANT_MIC_MIX = true
```
  - Set to `false` to disable mic mixing entirely (tab audio only).

- Caption chunk grace period (how long to wait after the last word before committing a line):
  - In `src/content/scrapingScript.ts`:
```
const CHUNK_GRACE_MS = 2000
```

- Output filenames
  - Recordings: `meet-trace-recording-<meet-suffix>-<timestamp>.webm`
  - Transcripts: `meet-trace-transcript-<meet-suffix>-<timestamp>.txt`

## Scripts

`npm run build` – single production build to `dist/`
`npm run watch` – rebuild on change (remember to reload the extension in Chrome)

## Dependencies & toolchain

- TypeScript (target es2020)
- webpack 5 + ts-loader
- copy-webpack-plugin, clean-webpack-plugin
- @types/chrome, @types/node

These are already declared in `package.json`:
```
"devDependencies": {
  "@types/chrome": "^0.0.326",
  "@types/node": "^24.0.4",
  "clean-webpack-plugin": "^4.0.0",
  "copy-webpack-plugin": "^13.0.1",
  "ts-loader": "^9.5.0",
  "typescript": "^5.8.3",
  "webpack": "^5.99.9",
  "webpack-cli": "^6.0.1"
}
```

## Permissions explained
- `activeTab`, `tabs` – query the active tab (needed to target/label the recording).
- `downloads` – save transcript/recording files locally.
- `tabCapture` / `desktopCapture` – capture video/audio from the current tab.
- `offscreen` – create an offscreen document for safe/background recording logic.
- `storage` – persist keyword alerts and recording-state hints across sessions.
- `notifications` – fire desktop alerts when a keyword is detected in live captions.
- `host_permissions: ["https://meet.google.com/*"]` – limit content script to Google Meet.

## Troubleshooting / FAQ

Q: What do I do if I don't see any transcript text?
Answer:
 - Make sure **Captions** are enabled in the Google Meet UI.
 - The extension only scrapes from `https://meet.google.com/*`.
 - Reload the Google Meet page after (re)loading the extension.

Question: Keyword notifications are not appearing.
Answer:
 - Open `chrome://extensions` → your extension → **Service Worker** → Inspect, and check for `notifications.create error:` in the console.
 - Make sure Chrome notifications are allowed: `chrome://settings/content/notifications`.
 - Ensure the keyword is added in the popup before the meeting starts.

Question: What do I do when I see: "Failed to start recording: Offscreen not ready" or similar?
Answer:
 - Open `chrome://extensions`, click Reload on the extension, then try again.
 - Ensure Chrome is up to date (Manifest V3 + Offscreen API supported).
 - Some enterprise policies can block offscreen—check your admin/device policies if applicable.

No microphone audio in the recording.
- Click `Enable Microphone` in the popup. If the inline prompt fails, a Mic Setup tab opens. Click `Enable` there and allow.
- Also check the OS mic permissions for Chrome (`System Settings` → `Privacy` → `Microphone`).

Question: Why is my recording silent or very quiet?
Answer:
 - Make sure the Google Meet tab is playing audio (unmuted).
 - If you muted the site/tab or Google Meet, tab audio won't be captured.
 - If mic mix is on, confirm the OS/input device and levels.

Question: "Stop & Download" finishes but no file appears. What do I do?
Answer:
 - Check the browser Downloads panel.
 - If you have "Ask where to save each file" enabled, a save dialog should appear.
 - Some download managers/extensions can interfere. Disable and retry.

Question: Why are the popup buttons not enabling/disabling correctly?
Answer:
 - The popup reflects state broadcast from `background`/`offscreen`. If it gets out of sync, stop the recording (if any), then click `Reload` on the extension in `chrome://extensions`.

## Development tips

 - Use `npm run watch` during iteration.
 - Background / notification logs: `chrome://extensions` → your extension → **Service Worker** → Inspect (look for `[background]` prefixed lines).
 - Offscreen logs: same Service Worker console, look for `[offscreen]` prefixed lines.
 - Content script logs: Google Meet tab → DevTools Console (look for `[caption]`, `[transcript committed]`, `[scrapingScript]` prefixed lines).
