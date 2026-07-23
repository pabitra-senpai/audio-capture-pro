import type { Settings } from '@/types';

export const APP_NAME = 'Audio Capture Pro';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  defaultFilename: 'recording-{date}-{time}',
  format: 'webm',
  quality: 'high',
  notifications: true,
  autoSave: true,
  historyLimit: 200,
  storageLimitMB: 1024,
  keepTabAudible: true,
};

export const QUALITY_PRESETS: Record<
  Settings['quality'],
  { sampleRate: number; bitRate: number; label: string }
> = {
  low: { sampleRate: 22050, bitRate: 64_000, label: 'Low · 64 kbps' },
  medium: { sampleRate: 44100, bitRate: 128_000, label: 'Medium · 128 kbps' },
  high: { sampleRate: 48000, bitRate: 192_000, label: 'High · 192 kbps' },
  lossless: { sampleRate: 48000, bitRate: 320_000, label: 'Lossless · 320 kbps / WAV' },
};

export const DB_NAME = 'audio-capture-pro-db';
export const DB_VERSION = 1;
export const STORE_RECORDINGS = 'recordings';

export const STORAGE_KEYS = {
  settings: 'acp.settings',
  status: 'acp.status',
} as const;

export const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';

export const NOTIFY_ICON = 'icons/icon-128.png';
