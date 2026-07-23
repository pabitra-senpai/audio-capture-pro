# Audio Capture Pro

A premium Chrome extension for capturing the current tab's audio, built with **Manifest V3**, **TypeScript**, **React**, and **Vite**. Includes a beautiful popup, full recording history, glassmorphic settings page, light/dark/AMOLED themes, keyboard shortcuts, and local storage powered by IndexedDB.

> **Scope**: The extension captures audio from the current browser tab via `chrome.tabCapture`. It respects Chrome's security model and cannot capture DRM-protected streams or `chrome://` / `edge://` pages.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation (Load Unpacked)](#installation-load-unpacked)
- [Development](#development)
- [Build](#build)
- [Packaging](#packaging)
- [Permissions](#permissions)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [License](#license)

---

## Features

- **Tab audio capture** with `chrome.tabCapture` + `MediaRecorder` running in an MV3 offscreen document.
- **Formats**: WebM (Opus, streaming-friendly) and WAV (PCM 16-bit, re-encoded via `OfflineAudioContext`).
- **Quality presets** from 64 kbps to lossless 320 kbps / 48 kHz.
- **Popup**: large record button, ring pulse, live level meter, tab card, timer, and quick controls.
- **Recording history** page with search, sort, favorite, rename, download, delete, playback, and JSON metadata export/import.
- **Settings**: appearance (Light / Dark / AMOLED / System), format, quality, filename template, notifications, auto-save, history & storage limits.
- **Notifications** for start / pause / resume / save / errors.
- **Keyboard shortcuts** for start/stop, pause/resume, and opening history.
- **Themes**: Material 3-inspired glassmorphism with grain, spring animations, custom scrollbar, tabular numerics.
- **Storage**: 100% local (IndexedDB), no accounts, no cloud, no tracking.
- **Error recovery**: graceful handling of protected pages, no active tab, media stream failures, storage limits.

## Architecture

```
src/
├── background/          MV3 service worker: state machine, commands, notifications
├── offscreen/           Offscreen document: MediaRecorder, level metering, WAV export
├── popup/               React popup UI
├── options/             React settings page
├── history/             React recording manager page
├── components/          Reusable UI (icons, level meter)
├── hooks/               React hooks (theme, live status)
├── services/            Cross-context helpers (messaging, notify, wav encoder)
├── storage/             IndexedDB (recordings) + chrome.storage.local (prefs)
├── styles/              Global CSS with theme tokens
├── types/               Shared TypeScript types
├── utils/               Formatting, filename builder, constants
└── manifest.ts          @crxjs manifest source
```

State flow:

1. Popup dispatches `START_RECORDING` to the service worker.
2. Service worker ensures an offscreen document, requests a `tabCapture` stream id, and forwards it.
3. Offscreen creates a `MediaStream` from the tab, wires up analyser + destination + optional monitor, and starts `MediaRecorder`.
4. Level metering samples RMS every 100 ms and posts back to the worker → stored in `chrome.storage.local` for the popup to read.
5. On stop, the offscreen document optionally decodes WebM to a WAV Blob and writes the recording to IndexedDB.

## Installation (Load Unpacked)

1. **Clone or extract** the project.
2. `cd extension` (this folder).
3. Install dependencies: `yarn install` (or `npm install`).
4. Build: `yarn build`.
5. Open **Chrome → `chrome://extensions`** and enable **Developer mode**.
6. Click **Load unpacked** and select the generated `dist/` folder.
7. Pin **Audio Capture Pro** to your toolbar and start recording.

## Development

```
yarn install
yarn dev    # builds to dist/ in watch mode using @crxjs/vite-plugin
```

Reload the extension in `chrome://extensions` whenever the service worker or manifest changes.

## Build

```
yarn build
```

Produces a production `dist/` folder ready for `Load unpacked` or zipping.

## Packaging

```
yarn package
```

Zips the `dist/` folder into `release/audio-capture-pro-<timestamp>.zip`. Requires the `zip` binary.

## Permissions

| Permission       | Reason                                                             |
| ---------------- | ------------------------------------------------------------------ |
| `tabCapture`     | Capture audio from the active tab                                  |
| `offscreen`      | Run `MediaRecorder` in an offscreen document (required by MV3)     |
| `storage`        | Persist user settings and live recording status                    |
| `notifications`  | Show OS-level notifications for start, pause, save, and errors     |
| `activeTab`      | Read the current tab's title + URL to populate the popup           |
| `tabs`           | Detect when the recorded tab closes so we can safely stop capture  |
| `downloads`      | Save recordings and metadata exports to your Downloads folder      |

The extension does **not** request `<all_urls>` host permissions and has no remote code execution.

## Keyboard shortcuts

| Action              | Default                 |
| ------------------- | ----------------------- |
| Start / Stop        | `Alt + Shift + R`       |
| Pause / Resume      | `Alt + Shift + P`       |
| Open history page   | `Alt + Shift + H`       |

Remap them at `chrome://extensions/shortcuts`.

## Troubleshooting

- **\"This page cannot be captured by Chrome\"** — Chrome blocks recording on `chrome://`, `edge://`, extension pages, the Web Store, and some DRM sites. Switch to a normal tab.
- **No audio in the recording** — the tab may be muted. Un-mute the tab and start again. Check that \"Keep tab audible\" is on in Settings.
- **WAV export failed** — memory-heavy for very long recordings. Try WebM, or shorter clips at a lower sample rate.
- **Recording stopped unexpectedly** — closing or navigating away from the recorded tab ends the stream; the partial audio is saved automatically.
- **Notifications not visible** — enable notifications for Chrome in your OS settings.

## FAQ

**Where are recordings stored?** In your browser's IndexedDB. Nothing leaves your machine.

**Can I record microphone audio?** Not in this build — this extension records tab audio only, as per Chrome's `tabCapture` API. The offscreen architecture can be extended to also request `getUserMedia({ audio: true })` if needed.

**Can I record multiple tabs at once?** Chrome allows only one active tab capture per extension instance. Stop the current recording before starting a new one.

**Do exported JSON files include the audio?** No — exports contain metadata only (name, duration, tab, favorite). Use the per-recording **Save** action to download the audio file itself.

**Is telemetry collected?** No. There are no external network calls.

## License

MIT — see `LICENSE`.
