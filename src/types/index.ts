export type AudioFormat = 'webm' | 'wav';

export type AudioQuality = 'low' | 'medium' | 'high' | 'lossless';

export type ThemeMode = 'light' | 'dark' | 'amoled' | 'system';

export interface RecordingMeta {
  id: string;
  name: string;
  createdAt: number;
  durationMs: number;
  sizeBytes: number;
  format: AudioFormat;
  mimeType: string;
  sampleRate: number;
  bitRate: number;
  tabTitle: string;
  tabUrl: string;
  favorite: boolean;
}

export interface Recording extends RecordingMeta {
  blob: Blob;
}

export type RecordingState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'error';

export interface LiveRecordingStatus {
  state: RecordingState;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedMs: number;
  tabId: number | null;
  tabTitle: string;
  tabUrl: string;
  errorMessage?: string;
  level: number;
}

export interface Settings {
  theme: ThemeMode;
  defaultFilename: string;
  format: AudioFormat;
  quality: AudioQuality;
  notifications: boolean;
  autoSave: boolean;
  historyLimit: number;
  storageLimitMB: number;
  keepTabAudible: boolean;
}

export interface StorageUsage {
  used: number;
  quota: number;
  count: number;
}

export type BgMessage =
  | { type: 'START_RECORDING' }
  | { type: 'PAUSE_RECORDING' }
  | { type: 'RESUME_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'GET_STATUS' }
  | { type: 'OPEN_HISTORY' }
  | { type: 'OPEN_OPTIONS' };

export type OffscreenMessage =
  | { type: 'OFFSCREEN_START'; streamId: string; settings: Settings; tab: { title: string; url: string; id: number } }
  | { type: 'OFFSCREEN_PAUSE' }
  | { type: 'OFFSCREEN_RESUME' }
  | { type: 'OFFSCREEN_STOP' }
  | { type: 'OFFSCREEN_STATUS_QUERY' };

export type OffscreenEvent =
  | { type: 'OFFSCREEN_STARTED'; startedAt: number }
  | { type: 'OFFSCREEN_PAUSED'; accumulatedMs: number }
  | { type: 'OFFSCREEN_RESUMED'; startedAt: number }
  | { type: 'OFFSCREEN_LEVEL'; level: number }
  | { type: 'OFFSCREEN_STOPPED'; recording: RecordingMeta }
  | { type: 'OFFSCREEN_ERROR'; message: string };
