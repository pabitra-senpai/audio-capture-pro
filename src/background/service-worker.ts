import { OFFSCREEN_PATH, DEFAULT_SETTINGS } from '@/utils/constants';
import type {
  BgMessage,
  OffscreenEvent,
  OffscreenMessage,
  RecordingMeta,
} from '@/types';
import { getSettings, getStatus, resetStatus, setStatus } from '@/storage/prefs';
import { notify } from '@/services/notify';
import { pruneToLimit } from '@/storage/db';

const OFFSCREEN_URL = chrome.runtime.getURL(OFFSCREEN_PATH);

async function hasOffscreenDocument(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts?.({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [OFFSCREEN_URL],
  });
  return Array.isArray(contexts) && contexts.length > 0;
}

async function ensureOffscreen(): Promise<void> {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: ['USER_MEDIA' as chrome.offscreen.Reason],
    justification: 'Recording tab audio via MediaRecorder requires an offscreen document.',
  });
}

async function closeOffscreen(): Promise<void> {
  if (await hasOffscreenDocument()) {
    try {
      await chrome.offscreen.closeDocument();
    } catch {
      /* ignore */
    }
  }
}

async function sendOffscreen(msg: OffscreenMessage): Promise<void> {
  await chrome.runtime.sendMessage(msg).catch(() => undefined);
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function startRecording(): Promise<void> {
  const status = await getStatus();
  if (status.state === 'recording' || status.state === 'paused' || status.state === 'starting') {
    return;
  }
  const tab = await getActiveTab();
  if (!tab || tab.id === undefined) {
    await setStatus({ state: 'error', errorMessage: 'No active tab available.' });
    await notify('Recording failed', 'No active tab available.');
    return;
  }
  if (!tab.url || /^(chrome|edge|about|chrome-extension):/i.test(tab.url)) {
    await setStatus({ state: 'error', errorMessage: 'This page cannot be captured by Chrome.' });
    await notify('Recording failed', 'Chrome does not allow capturing this page.');
    return;
  }
  await setStatus({
    state: 'starting',
    tabId: tab.id,
    tabTitle: tab.title ?? 'Untitled',
    tabUrl: tab.url ?? '',
    startedAt: null,
    pausedAt: null,
    accumulatedMs: 0,
    level: 0,
    errorMessage: undefined,
  });
  try {
    await ensureOffscreen();
    const streamId = await new Promise<string>((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id! }, (id) => {
        if (chrome.runtime.lastError || !id) {
          reject(new Error(chrome.runtime.lastError?.message ?? 'Failed to acquire media stream.'));
        } else {
          resolve(id);
        }
      });
    });
    const settings = await getSettings();
    await sendOffscreen({
      type: 'OFFSCREEN_START',
      streamId,
      settings,
      tab: { id: tab.id, title: tab.title ?? 'Untitled', url: tab.url ?? '' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await setStatus({ state: 'error', errorMessage: message });
    await notify('Recording failed', message);
    await closeOffscreen();
  }
}

async function pauseRecording(): Promise<void> {
  const status = await getStatus();
  if (status.state !== 'recording') return;
  await sendOffscreen({ type: 'OFFSCREEN_PAUSE' });
}

async function resumeRecording(): Promise<void> {
  const status = await getStatus();
  if (status.state !== 'paused') return;
  await sendOffscreen({ type: 'OFFSCREEN_RESUME' });
}

async function stopRecording(): Promise<void> {
  const status = await getStatus();
  if (status.state === 'idle') return;
  await setStatus({ state: 'stopping' });
  await sendOffscreen({ type: 'OFFSCREEN_STOP' });
}

async function handleBgMessage(msg: BgMessage): Promise<void> {
  switch (msg.type) {
    case 'START_RECORDING':
      await startRecording();
      break;
    case 'PAUSE_RECORDING':
      await pauseRecording();
      break;
    case 'RESUME_RECORDING':
      await resumeRecording();
      break;
    case 'STOP_RECORDING':
      await stopRecording();
      break;
    case 'OPEN_HISTORY':
      await chrome.tabs.create({ url: chrome.runtime.getURL('src/history/history.html') });
      break;
    case 'OPEN_OPTIONS':
      await chrome.runtime.openOptionsPage();
      break;
    case 'GET_STATUS':
      break;
  }
}

async function handleOffscreenEvent(evt: OffscreenEvent): Promise<void> {
  switch (evt.type) {
    case 'OFFSCREEN_STARTED':
      await setStatus({
        state: 'recording',
        startedAt: evt.startedAt,
        pausedAt: null,
        accumulatedMs: 0,
        errorMessage: undefined,
      });
      await notify('Recording started', 'Capturing tab audio.');
      break;
    case 'OFFSCREEN_PAUSED':
      await setStatus({
        state: 'paused',
        pausedAt: Date.now(),
        accumulatedMs: evt.accumulatedMs,
        startedAt: null,
      });
      await notify('Recording paused', 'Recording is paused.', { silent: true });
      break;
    case 'OFFSCREEN_RESUMED':
      await setStatus({ state: 'recording', startedAt: evt.startedAt, pausedAt: null });
      await notify('Recording resumed', 'Capturing tab audio again.', { silent: true });
      break;
    case 'OFFSCREEN_LEVEL':
      await setStatus({ level: evt.level });
      break;
    case 'OFFSCREEN_STOPPED':
      await handleStopped(evt.recording);
      break;
    case 'OFFSCREEN_ERROR':
      await setStatus({ state: 'error', errorMessage: evt.message });
      await notify('Recording error', evt.message);
      await closeOffscreen();
      break;
  }
}

async function handleStopped(meta: RecordingMeta): Promise<void> {
  const settings = await getSettings();
  await resetStatus();
  await closeOffscreen();
  const pruned = await pruneToLimit(settings.historyLimit ?? DEFAULT_SETTINGS.historyLimit);
  const extra = pruned > 0 ? ` (${pruned} older removed)` : '';
  await notify('Recording saved', `${meta.name} saved to history.${extra}`);
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  if (!settings) return;
  await resetStatus();
});

chrome.runtime.onStartup.addListener(async () => {
  await resetStatus();
  await closeOffscreen();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const msg = message as BgMessage | OffscreenEvent;
  if ('type' in msg && msg.type.startsWith('OFFSCREEN_')) {
    handleOffscreenEvent(msg as OffscreenEvent).finally(() => sendResponse({ ok: true }));
    return true;
  }
  handleBgMessage(msg as BgMessage).finally(() => sendResponse({ ok: true }));
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-record') {
    const s = await getStatus();
    if (s.state === 'recording' || s.state === 'paused') {
      await stopRecording();
    } else if (s.state === 'idle' || s.state === 'error') {
      await startRecording();
    }
  } else if (command === 'pause-resume') {
    const s = await getStatus();
    if (s.state === 'recording') await pauseRecording();
    else if (s.state === 'paused') await resumeRecording();
  } else if (command === 'open-history') {
    await chrome.tabs.create({ url: chrome.runtime.getURL('src/history/history.html') });
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const s = await getStatus();
  if (s.tabId === tabId && (s.state === 'recording' || s.state === 'paused')) {
    await stopRecording();
  }
});
