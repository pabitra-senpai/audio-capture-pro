import { useEffect, useMemo, useState } from 'react';
import { useLiveStatus, useElapsed } from '@/hooks/useStatus';
import { useTheme } from '@/hooks/useTheme';
import { LevelMeter } from '@/components/LevelMeter';
import {
  IconAlert,
  IconDot,
  IconDownload,
  IconHistory,
  IconMic,
  IconPause,
  IconPip,
  IconPlay,
  IconSettings,
  IconStar,
  IconStop,
  IconTrash,
} from '@/components/Icon';
import { send } from '@/services/messaging';
import { deleteRecording, getRecording, getUsage, listRecordings, updateRecordingMeta } from '@/storage/db';
import { formatBytes, formatDate, formatDuration } from '@/utils/format';
import type { RecordingMeta, StorageUsage } from '@/types';
import { closePip, isPipOpen, isPipSupported, openPip } from './pip';

function TimerDisplay({ ms }: { ms: number }) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const mm = pad(m);
  const ss = pad(s);
  const cs = pad(Math.floor((ms % 1000) / 10));
  return (
    <div className="timer" data-testid="popup-timer">
      {h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`}
      <span className="ms">.{cs}</span>
    </div>
  );
}

async function downloadRecording(id: string): Promise<void> {
  const rec = await getRecording(id);
  if (!rec) return;
  const url = URL.createObjectURL(rec.blob);
  try {
    await chrome.downloads.download({ url, filename: rec.name, saveAs: false });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export function PopupApp() {
  useTheme();
  const status = useLiveStatus();
  const elapsed = useElapsed(status);
  const [recent, setRecent] = useState<RecordingMeta[]>([]);
  const [usage, setUsage] = useState<StorageUsage>({ used: 0, quota: 0, count: 0 });
  const [refreshTick, setRefreshTick] = useState(0);
  const [pipOpen, setPipOpen] = useState(false);
  const pipSupported = useMemo(() => isPipSupported(), []);

  const togglePip = () => {
    if (isPipOpen()) {
      closePip();
      setPipOpen(false);
      return;
    }
    // No await before requestWindow() inside openPip — keeps this call inside
    // the click's user-activation window, which the PiP API requires.
    void openPip(() => setPipOpen(false)).then(setPipOpen);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [list, u] = await Promise.all([listRecordings(), getUsage()]);
      if (!mounted) return;
      setRecent(list.slice(0, 4));
      setUsage(u);
    })();
    return () => {
      mounted = false;
    };
  }, [refreshTick, status.state]);

  const stateBadge = useMemo(() => {
    switch (status.state) {
      case 'recording':
        return { label: 'Recording', cls: 'rec' };
      case 'paused':
        return { label: 'Paused', cls: 'paused' };
      case 'starting':
        return { label: 'Starting', cls: 'rec' };
      case 'stopping':
        return { label: 'Saving', cls: 'paused' };
      case 'error':
        return { label: 'Error', cls: 'err' };
      default:
        return { label: 'Ready', cls: '' };
    }
  }, [status.state]);

  const isBusy =
    status.state === 'recording' || status.state === 'paused' || status.state === 'starting' || status.state === 'stopping';

  const activeTab = useActiveTab(status);
  const tabTitle = status.tabTitle || activeTab.title;
  const tabUrl = status.tabUrl || activeTab.url;
  const favicon = activeTab.favIconUrl;
  const captureBlocked = !tabUrl || /^(chrome|edge|about|chrome-extension):/i.test(tabUrl);

  const onMain = () => {
    if (status.state === 'idle' || status.state === 'error') void send({ type: 'START_RECORDING' });
    else void send({ type: 'STOP_RECORDING' });
  };

  return (
    <div className="popup acp-fadein">
      <header className="brand">
        <div className="brand-mark">
          <div className="logo" aria-hidden><IconMic /></div>
          <div>
            <div className="brand-title">Audio Capture</div>
            <div className="brand-sub">Pro · v1.0</div>
          </div>
        </div>
        <div className="brand-actions">
          {pipSupported && (
            <button
              className={`acp-btn icon ghost ${pipOpen ? 'active' : ''}`}
              data-testid="popup-toggle-pip"
              title={pipOpen ? 'Close floating indicator' : 'Float recording indicator'}
              onClick={togglePip}
            >
              <IconPip />
            </button>
          )}
          <button className="acp-btn icon ghost" data-testid="popup-open-history"
            title="Open history" onClick={() => send({ type: 'OPEN_HISTORY' })}>
            <IconHistory />
          </button>
          <button className="acp-btn icon ghost" data-testid="popup-open-settings"
            title="Open settings" onClick={() => send({ type: 'OPEN_OPTIONS' })}>
            <IconSettings />
          </button>
        </div>
      </header>

      <section className="tab-card" data-testid="popup-tab-card">
        <div className="favicon">
          {favicon ? <img src={favicon} alt="" /> : <IconMic />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="title" title={tabTitle}>{tabTitle || 'No active tab'}</div>
          <div className="url" title={tabUrl}>{tabUrl || 'Open a tab to begin capturing audio'}</div>
        </div>
        <div className={`state ${stateBadge.cls}`}>{stateBadge.label}</div>
      </section>

      {status.state === 'error' && status.errorMessage && (
        <div className="error-banner" role="alert" data-testid="popup-error-banner">
          <IconAlert />
          <div>{status.errorMessage}</div>
        </div>
      )}

      <section className="rec-stage">
        <TimerDisplay ms={elapsed} />
        <div className="caption">
          {status.state === 'recording' && 'Live tab capture'}
          {status.state === 'paused' && 'Paused — press resume to continue'}
          {status.state === 'idle' && 'Press record to capture this tab'}
          {status.state === 'starting' && 'Starting capture…'}
          {status.state === 'stopping' && 'Saving your recording…'}
          {status.state === 'error' && 'Recording halted — try again'}
        </div>
        <div className="meter-wrap">
          <LevelMeter level={status.level} state={status.state} />
        </div>
        <div className="main-btn-wrap">
          <button
            className="side-btn"
            data-testid="popup-pause-resume-btn"
            disabled={!(status.state === 'recording' || status.state === 'paused')}
            title={status.state === 'paused' ? 'Resume' : 'Pause'}
            onClick={() =>
              status.state === 'paused'
                ? send({ type: 'RESUME_RECORDING' })
                : send({ type: 'PAUSE_RECORDING' })
            }
          >
            {status.state === 'paused' ? <IconPlay /> : <IconPause />}
          </button>
          <button
            className={`main-btn ${status.state === 'recording' ? 'recording' : ''} ${status.state === 'paused' ? 'paused' : ''} ${captureBlocked && status.state === 'idle' ? 'disabled' : ''}`}
            data-testid="popup-record-btn"
            disabled={captureBlocked && (status.state === 'idle' || status.state === 'error')}
            onClick={onMain}
            aria-label={isBusy ? 'Stop recording' : 'Start recording'}
          >
            <span className="ring" />
            {isBusy ? <IconStop /> : <IconDot />}
          </button>
          <button
            className="side-btn"
            data-testid="popup-stop-btn"
            disabled={!isBusy}
            title="Stop"
            onClick={() => send({ type: 'STOP_RECORDING' })}
          >
            <IconStop />
          </button>
        </div>
        <div className="hint-wrap">
          <div className="hint">⌥⇧R record · ⌥⇧P pause · ⌥⇧H history</div>
        </div>
      </section>

      <div className="section-title">
        <span>Recent</span>
        <button data-testid="popup-view-all" onClick={() => send({ type: 'OPEN_HISTORY' })}>View all →</button>
      </div>
      <section className="recent" data-testid="popup-recent-list">
        {recent.length === 0 && (
          <div className="recent-empty">No recordings yet — hit record to make your first one.</div>
        )}
        {recent.map((r) => (
          <RecentRow
            key={r.id}
            r={r}
            onRefresh={() => setRefreshTick((t) => t + 1)}
          />
        ))}
      </section>

      <footer className="footer">
        <div className="usage" data-testid="popup-storage-usage">
          {usage.count} clip{usage.count === 1 ? '' : 's'} · {formatBytes(usage.used)}
        </div>
        <a href="#" onClick={(e) => { e.preventDefault(); send({ type: 'OPEN_OPTIONS' }); }}>
          Manage settings
        </a>
      </footer>
    </div>
  );
}

function RecentRow({ r, onRefresh }: { r: RecordingMeta; onRefresh: () => void }) {
  const [fav, setFav] = useState(r.favorite);
  return (
    <div className="recent-row" data-testid={`popup-recent-${r.id}`}>
      <div className="glyph"><IconMic /></div>
      <div style={{ minWidth: 0 }}>
        <div className="name" title={r.name}>{r.name}</div>
        <div className="meta">
          {formatDuration(r.durationMs)} · {formatBytes(r.sizeBytes)} · {formatDate(r.createdAt)}
        </div>
      </div>
      <div className="actions">
        <button className="acp-btn icon ghost" title="Favorite" data-testid={`recent-fav-${r.id}`}
          onClick={async () => {
            const next = !fav; setFav(next);
            await updateRecordingMeta(r.id, { favorite: next });
            onRefresh();
          }}>
          <IconStar filled={fav} style={{ color: fav ? 'var(--brand)' : undefined }} />
        </button>
        <button className="acp-btn icon ghost" title="Download" data-testid={`recent-dl-${r.id}`}
          onClick={() => downloadRecording(r.id)}>
          <IconDownload />
        </button>
        <button className="acp-btn icon ghost" title="Delete" data-testid={`recent-del-${r.id}`}
          onClick={async () => { await deleteRecording(r.id); onRefresh(); }}>
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

function useActiveTab(status: { tabTitle: string; tabUrl: string }): {
  title: string;
  url: string;
  favIconUrl?: string;
} {
  const [tab, setTab] = useState<{ title: string; url: string; favIconUrl?: string }>({
    title: status.tabTitle,
    url: status.tabUrl,
  });
  useEffect(() => {
    let mounted = true;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs[0];
      if (!mounted || !t) return;
      setTab({ title: t.title ?? '', url: t.url ?? '', favIconUrl: t.favIconUrl });
    });
    return () => {
      mounted = false;
    };
  }, []);
  return tab;
}
