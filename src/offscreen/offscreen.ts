import type { OffscreenEvent, OffscreenMessage, RecordingMeta, Settings } from '@/types';
import { QUALITY_PRESETS } from '@/utils/constants';
import { buildFilename, uuid } from '@/utils/format';
import { putRecording } from '@/storage/db';
import { decodeToChannels, encodeWav } from '@/services/wav';

interface Session {
  stream: MediaStream;
  recorder: MediaRecorder;
  audioCtx: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  destinationNode: MediaStreamAudioDestinationNode;
  monitorNode: AudioNode | null;
  chunks: BlobPart[];
  mimeType: string;
  startedAt: number;
  accumulatedMs: number;
  levelInterval: number | null;
  settings: Settings;
  tab: { id: number; title: string; url: string };
  paused: boolean;
}

let session: Session | null = null;

function post(evt: OffscreenEvent): void {
  chrome.runtime.sendMessage(evt).catch(() => undefined);
}

function pickMimeType(preferred: Settings['format']): string {
  const candidates =
    preferred === 'wav'
      ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'audio/webm';
}

function startLevelMeter(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.fftSize);
  return window.setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const level = Math.min(1, rms * 2.2);
    post({ type: 'OFFSCREEN_LEVEL', level });
  }, 100);
}

async function startCapture(msg: Extract<OffscreenMessage, { type: 'OFFSCREEN_START' }>): Promise<void> {
  try {
    const preset = QUALITY_PRESETS[msg.settings.quality];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // Chrome tabCapture uses these mandatory constraints
        mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: msg.streamId },
      } as MediaTrackConstraints,
      video: false,
    });
    const AC = window.AudioContext;
    const audioCtx = new AC({ sampleRate: preset.sampleRate });
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;

    const destinationNode = audioCtx.createMediaStreamDestination();
    source.connect(analyser);
    source.connect(destinationNode);

    let monitorNode: AudioNode | null = null;
    if (msg.settings.keepTabAudible) {
      monitorNode = audioCtx.destination;
      source.connect(monitorNode);
    }

    const mimeType = pickMimeType(msg.settings.format);
    const recorder = new MediaRecorder(destinationNode.stream, {
      mimeType,
      audioBitsPerSecond: preset.bitRate,
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = (e) => {
      const message = (e as unknown as { error?: DOMException }).error?.message ?? 'Recorder error';
      post({ type: 'OFFSCREEN_ERROR', message });
      cleanupSession();
    };
    recorder.onstop = () => finalize().catch((err) =>
      post({ type: 'OFFSCREEN_ERROR', message: err instanceof Error ? err.message : String(err) }),
    );

    session = {
      stream,
      recorder,
      audioCtx,
      analyser,
      source,
      destinationNode,
      monitorNode,
      chunks,
      mimeType,
      startedAt: Date.now(),
      accumulatedMs: 0,
      levelInterval: null,
      settings: msg.settings,
      tab: msg.tab,
      paused: false,
    };
    recorder.start(1000);
    session.levelInterval = startLevelMeter(analyser);
    post({ type: 'OFFSCREEN_STARTED', startedAt: session.startedAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start capture';
    post({ type: 'OFFSCREEN_ERROR', message });
    cleanupSession();
  }
}

function pauseSession(): void {
  if (!session || session.paused) return;
  session.recorder.pause();
  const now = Date.now();
  session.accumulatedMs += now - session.startedAt;
  session.paused = true;
  if (session.levelInterval !== null) {
    clearInterval(session.levelInterval);
    session.levelInterval = null;
  }
  post({ type: 'OFFSCREEN_PAUSED', accumulatedMs: session.accumulatedMs });
}

function resumeSession(): void {
  if (!session || !session.paused) return;
  session.recorder.resume();
  session.startedAt = Date.now();
  session.paused = false;
  session.levelInterval = startLevelMeter(session.analyser);
  post({ type: 'OFFSCREEN_RESUMED', startedAt: session.startedAt });
}

function stopSession(): void {
  if (!session) return;
  if (session.recorder.state !== 'inactive') session.recorder.stop();
  if (session.levelInterval !== null) {
    clearInterval(session.levelInterval);
    session.levelInterval = null;
  }
}

function cleanupSession(): void {
  if (!session) return;
  try {
    session.stream.getTracks().forEach((t) => t.stop());
  } catch {
    /* ignore */
  }
  try {
    session.source.disconnect();
    session.analyser.disconnect();
    session.destinationNode.disconnect();
    session.monitorNode?.disconnect?.();
  } catch {
    /* ignore */
  }
  try {
    session.audioCtx.close();
  } catch {
    /* ignore */
  }
  session = null;
}

async function finalize(): Promise<void> {
  if (!session) return;
  const s = session;
  const durationMs = s.paused ? s.accumulatedMs : s.accumulatedMs + (Date.now() - s.startedAt);
  const raw = new Blob(s.chunks, { type: s.mimeType });
  const preset = QUALITY_PRESETS[s.settings.quality];

  let finalBlob: Blob = raw;
  let outMime = s.mimeType;
  let outFormat: 'webm' | 'wav' = 'webm';
  if (s.settings.format === 'wav') {
    try {
      const { channels, sampleRate } = await decodeToChannels(raw, preset.sampleRate);
      finalBlob = encodeWav(channels, sampleRate);
      outMime = 'audio/wav';
      outFormat = 'wav';
    } catch (err) {
      post({
        type: 'OFFSCREEN_ERROR',
        message: `WAV export failed, kept WebM: ${err instanceof Error ? err.message : err}`,
      });
      outFormat = 'webm';
    }
  }

  const name = `${buildFilename(s.settings.defaultFilename, s.tab.title)}.${outFormat}`;
  const meta: RecordingMeta = {
    id: uuid(),
    name,
    createdAt: Date.now(),
    durationMs,
    sizeBytes: finalBlob.size,
    format: outFormat,
    mimeType: outMime,
    sampleRate: preset.sampleRate,
    bitRate: preset.bitRate,
    tabTitle: s.tab.title,
    tabUrl: s.tab.url,
    favorite: false,
  };
  await putRecording({ ...meta, blob: finalBlob });
  cleanupSession();
  post({ type: 'OFFSCREEN_STOPPED', recording: meta });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const msg = message as OffscreenMessage;
  if (!msg || typeof msg.type !== 'string') return false;
  if (!msg.type.startsWith('OFFSCREEN_')) return false;
  switch (msg.type) {
    case 'OFFSCREEN_START':
      startCapture(msg).finally(() => sendResponse({ ok: true }));
      return true;
    case 'OFFSCREEN_PAUSE':
      pauseSession();
      sendResponse({ ok: true });
      return false;
    case 'OFFSCREEN_RESUME':
      resumeSession();
      sendResponse({ ok: true });
      return false;
    case 'OFFSCREEN_STOP':
      stopSession();
      sendResponse({ ok: true });
      return false;
    default:
      return false;
  }
});
