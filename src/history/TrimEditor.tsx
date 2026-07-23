import { useEffect, useMemo, useRef, useState } from 'react';
import { getRecording, putRecording } from '@/storage/db';
import { decodeToChannels, encodeWav } from '@/services/wav';
import { formatDuration, uuid } from '@/utils/format';
import { IconAlert, IconClose, IconPause, IconPlay, IconScissors } from '@/components/Icon';
import type { Recording } from '@/types';

const PEAK_BUCKETS = 480;
const MIN_SELECTION_SEC = 0.1;

interface Props {
  recId: string;
  recName: string;
  onClose: () => void;
  onSaved: () => void;
}

type LoadState = 'loading' | 'ready' | 'error';

function buildPeaks(samples: Float32Array<ArrayBufferLike>, buckets: number): Float32Array {
  const peaks = new Float32Array(buckets);
  const bucketSize = Math.max(1, Math.floor(samples.length / buckets));
  for (let b = 0; b < buckets; b++) {
    const start = b * bucketSize;
    const end = b === buckets - 1 ? samples.length : start + bucketSize;
    let max = 0;
    for (let i = start; i < end; i++) {
      const v = Math.abs(samples[i] ?? 0);
      if (v > max) max = v;
    }
    peaks[b] = max;
  }
  return peaks;
}

export function TrimEditor({ recId, recName, onClose, onSaved }: Props) {
  const [state, setState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const channelsRef = useRef<Float32Array[] | null>(null);
  const sampleRateRef = useRef(48000);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);

  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playStartedAtRef = useRef(0);
  const rafRef = useRef(0);

  const waveRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load + decode the recording once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const full = await getRecording(recId);
      if (!full || full.blob.size === 0) {
        if (!cancelled) {
          setErrorMessage('Audio isn\u2019t stored locally for this recording, so it can\u2019t be trimmed.');
          setState('error');
        }
        return;
      }
      try {
        const { channels, sampleRate } = await decodeToChannels(full.blob, full.sampleRate || 48000);
        if (cancelled) return;
        channelsRef.current = channels;
        sampleRateRef.current = sampleRate;
        const dur = (channels[0]?.length ?? 0) / sampleRate;
        setDuration(dur);
        setStart(0);
        setEnd(dur);
        setPeaks(buildPeaks(channels[0] ?? new Float32Array(), PEAK_BUCKETS));
        setState('ready');
      } catch {
        if (!cancelled) {
          setErrorMessage('Couldn\u2019t decode this recording for editing.');
          setState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recId]);

  // Draw the waveform whenever peaks or the selection change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || duration === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const styles = getComputedStyle(document.documentElement);
    const brand = styles.getPropertyValue('--brand').trim() || '#ff5a1f';
    const dim = styles.getPropertyValue('--border-2').trim() || 'rgba(0,0,0,0.15)';
    const brandSoft = styles.getPropertyValue('--brand-soft').trim() || 'rgba(255,90,31,0.12)';

    const selStartX = (start / duration) * w;
    const selEndX = (end / duration) * w;
    ctx.fillStyle = brandSoft;
    ctx.fillRect(selStartX, 0, Math.max(0, selEndX - selStartX), h);

    const barGap = 1;
    const barWidth = w / peaks.length - barGap;
    for (let i = 0; i < peaks.length; i++) {
      const x = i * (barWidth + barGap);
      const inSelection = x >= selStartX && x <= selEndX;
      const bh = Math.max(2, peaks[i] * (h - 4));
      const y = (h - bh) / 2;
      ctx.fillStyle = inSelection ? brand : dim;
      ctx.fillRect(x, y, Math.max(1, barWidth), bh);
    }
  }, [peaks, start, end, duration]);

  // Drag handling for the two selection handles.
  useEffect(() => {
    if (!dragging) return;
    const timeFromClientX = (clientX: number): number => {
      const el = waveRef.current;
      if (!el || duration === 0) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * duration;
    };
    const onMove = (e: PointerEvent) => {
      const t = timeFromClientX(e.clientX);
      if (dragging === 'start') {
        setStart(Math.min(t, end - MIN_SELECTION_SEC));
      } else {
        setEnd(Math.max(t, start + MIN_SELECTION_SEC));
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, start, end, duration]);

  const stopPreview = () => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  };

  const playPreview = () => {
    const channels = channelsRef.current;
    if (!channels || end - start <= 0) return;
    stopPreview();
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = audioCtxRef.current ?? new AC();
    audioCtxRef.current = ctx;

    const buffer = ctx.createBuffer(channels.length, channels[0].length, sampleRateRef.current);
    channels.forEach((c, i) => buffer.getChannelData(i).set(c));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0, start, end - start);
    sourceRef.current = source;
    playStartedAtRef.current = ctx.currentTime;
    setPlaying(true);

    const tick = () => {
      const elapsed = ctx.currentTime - playStartedAtRef.current;
      const t = start + elapsed;
      if (t >= end) {
        stopPreview();
        setPlayhead(start);
        return;
      }
      setPlayhead(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    source.onended = () => {
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    };
  };

  useEffect(() => stopPreview, []); // stop any preview on unmount

  const save = async () => {
    const channels = channelsRef.current;
    if (!channels) return;
    setSaving(true);
    try {
      const sampleRate = sampleRateRef.current;
      const startIdx = Math.max(0, Math.floor(start * sampleRate));
      const endIdx = Math.min(channels[0].length, Math.floor(end * sampleRate));
      const sliced = channels.map((c) => c.slice(startIdx, endIdx));
      const wavBlob = encodeWav(sliced, sampleRate);

      const source = await getRecording(recId);
      const baseName = recName.replace(/\.[^./]+$/, '');
      const trimmed: Recording = {
        id: uuid(),
        name: `${baseName} (trimmed).wav`,
        createdAt: Date.now(),
        durationMs: Math.round((end - start) * 1000),
        sizeBytes: wavBlob.size,
        format: 'wav',
        mimeType: 'audio/wav',
        sampleRate,
        bitRate: sampleRate * 16 * channels.length,
        tabTitle: source?.tabTitle ?? '',
        tabUrl: source?.tabUrl ?? '',
        favorite: false,
        blob: wavBlob,
      };
      await putRecording(trimmed);
      onSaved();
    } catch {
      setErrorMessage('Couldn\u2019t save the trimmed clip. Please try again.');
      setState('error');
    } finally {
      setSaving(false);
    }
  };

  const selectionMs = useMemo(() => Math.max(0, (end - start) * 1000), [start, end]);
  const playheadPct = duration > 0 ? (playhead / duration) * 100 : 0;

  return (
    <div className="trim-overlay" role="dialog" aria-modal="true" aria-label="Trim recording">
      <div className="trim-modal acp-card acp-fadein">
        <div className="trim-head">
          <div className="trim-title">
            <IconScissors /> Trim &ldquo;{recName}&rdquo;
          </div>
          <button className="acp-btn icon ghost" onClick={onClose} title="Close" data-testid="trim-close">
            <IconClose />
          </button>
        </div>

        {state === 'loading' && (
          <div className="trim-body">
            <div className="acp-skeleton" style={{ height: 110 }} />
            <div className="trim-hint">Decoding audio for editing\u2026</div>
          </div>
        )}

        {state === 'error' && (
          <div className="trim-body">
            <div className="error-banner" role="alert">
              <IconAlert />
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        {state === 'ready' && (
          <div className="trim-body">
            <div className="trim-wave-wrap" ref={waveRef}>
              <canvas ref={canvasRef} className="trim-canvas" />
              {playing && <div className="trim-playhead" style={{ left: `${playheadPct}%` }} />}
              <div
                className="trim-handle start"
                style={{ left: `${(start / (duration || 1)) * 100}%` }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging('start');
                }}
                data-testid="trim-handle-start"
              />
              <div
                className="trim-handle end"
                style={{ left: `${(end / (duration || 1)) * 100}%` }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging('end');
                }}
                data-testid="trim-handle-end"
              />
            </div>

            <div className="trim-readout">
              <span>Start {formatDuration(start * 1000)}</span>
              <span>Selection {formatDuration(selectionMs)}</span>
              <span>End {formatDuration(end * 1000)}</span>
            </div>

            <div className="trim-actions">
              <button
                className="acp-btn"
                onClick={playing ? stopPreview : playPreview}
                data-testid="trim-preview"
              >
                {playing ? <IconPause /> : <IconPlay />} {playing ? 'Stop preview' : 'Preview selection'}
              </button>
              <button
                className="acp-btn primary"
                onClick={save}
                disabled={saving || selectionMs < MIN_SELECTION_SEC * 1000}
                data-testid="trim-save"
              >
                <IconScissors /> {saving ? 'Saving\u2026' : 'Save trimmed clip'}
              </button>
            </div>
            <div className="trim-hint">
              Saves as a new recording \u2014 the original stays untouched.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
