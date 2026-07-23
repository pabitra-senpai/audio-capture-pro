import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/utils/constants';
import type { Settings, LiveRecordingStatus } from '@/types';

export async function getSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const stored = res[STORAGE_KEYS.settings] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function setSettings(next: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const merged = { ...current, ...next };
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: merged });
  return merged;
}

export async function resetSettings(): Promise<Settings> {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  return DEFAULT_SETTINGS;
}

const IDLE_STATUS: LiveRecordingStatus = {
  state: 'idle',
  startedAt: null,
  pausedAt: null,
  accumulatedMs: 0,
  tabId: null,
  tabTitle: '',
  tabUrl: '',
  level: 0,
};

export async function getStatus(): Promise<LiveRecordingStatus> {
  const res = await chrome.storage.local.get(STORAGE_KEYS.status);
  return (res[STORAGE_KEYS.status] as LiveRecordingStatus | undefined) ?? IDLE_STATUS;
}

export async function setStatus(next: Partial<LiveRecordingStatus>): Promise<LiveRecordingStatus> {
  const current = await getStatus();
  const merged: LiveRecordingStatus = { ...current, ...next };
  await chrome.storage.local.set({ [STORAGE_KEYS.status]: merged });
  return merged;
}

export async function resetStatus(): Promise<LiveRecordingStatus> {
  await chrome.storage.local.set({ [STORAGE_KEYS.status]: IDLE_STATUS });
  return IDLE_STATUS;
}

export function onStatusChange(cb: (s: LiveRecordingStatus) => void): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName,
  ) => {
    if (area !== 'local') return;
    const ch = changes[STORAGE_KEYS.status];
    if (ch) cb((ch.newValue as LiveRecordingStatus) ?? IDLE_STATUS);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export function onSettingsChange(cb: (s: Settings) => void): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: chrome.storage.AreaName,
  ) => {
    if (area !== 'local') return;
    const ch = changes[STORAGE_KEYS.settings];
    if (ch) cb({ ...DEFAULT_SETTINGS, ...((ch.newValue as Partial<Settings>) ?? {}) });
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
