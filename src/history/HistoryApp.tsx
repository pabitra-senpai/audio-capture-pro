import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import {
  deleteRecording,
  getRecording,
  getUsage,
  listRecordings,
  putRecording,
  updateRecordingMeta,
} from '@/storage/db';
import { formatBytes, formatDate, formatDuration, uuid } from '@/utils/format';
import type { AudioFormat, RecordingMeta, StorageUsage } from '@/types';
import {
  IconDownload,
  IconMic,
  IconScissors,
  IconSearch,
  IconStar,
  IconTrash,
  IconUpload,
} from '@/components/Icon';
import { TrimEditor } from './TrimEditor';

type SortKey = 'newest' | 'oldest' | 'longest' | 'largest' | 'name';

export function HistoryApp() {
  useTheme();
  const [items, setItems] = useState<RecordingMeta[] | null>(null);
  const [usage, setUsage] = useState<StorageUsage>({ used: 0, quota: 0, count: 0 });
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [favOnly, setFavOnly] = useState(false);
  const [trimTarget, setTrimTarget] = useState<RecordingMeta | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    const [list, u] = await Promise.all([listRecordings(), getUsage()]);
    setItems(list);
    setUsage(u);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const query = q.trim().toLowerCase();
    let list = items.filter((r) => {
      if (favOnly && !r.favorite) return false;
      if (!query) return true;
      return (
        r.name.toLowerCase().includes(query) ||
        r.tabTitle.toLowerCase().includes(query) ||
        r.tabUrl.toLowerCase().includes(query)
      );
    });
    switch (sort) {
      case 'oldest':
        list = [...list].sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'longest':
        list = [...list].sort((a, b) => b.durationMs - a.durationMs);
        break;
      case 'largest':
        list = [...list].sort((a, b) => b.sizeBytes - a.sizeBytes);
        break;
      case 'name':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [items, q, sort, favOnly]);

  const importMetadata = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as RecordingMeta[];
      if (!Array.isArray(data)) throw new Error('Expected an array');
      for (const rec of data) {
        const existing = await getRecording(rec.id);
        if (existing) {
          await updateRecordingMeta(existing.id, {
            name: rec.name ?? existing.name,
            favorite: rec.favorite ?? existing.favorite,
            tabTitle: rec.tabTitle ?? existing.tabTitle,
            tabUrl: rec.tabUrl ?? existing.tabUrl,
          });
        } else {
          const placeholderBlob = new Blob([], { type: rec.mimeType || 'audio/webm' });
          await putRecording({
            ...rec,
            id: rec.id || uuid(),
            createdAt: rec.createdAt || Date.now(),
            durationMs: rec.durationMs || 0,
            sizeBytes: rec.sizeBytes || 0,
            format: (rec.format as AudioFormat) || 'webm',
            mimeType: rec.mimeType || 'audio/webm',
            sampleRate: rec.sampleRate || 48000,
            bitRate: rec.bitRate || 192000,
            tabTitle: rec.tabTitle || 'Imported',
            tabUrl: rec.tabUrl || '',
            favorite: !!rec.favorite,
            blob: placeholderBlob,
          });
        }
      }
      await refresh();
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : err}`);
    }
  };

  const exportMetadata = () => {
    if (!items) return;
    const json = JSON.stringify(items, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    chrome.downloads
      .download({ url, filename: `audio-capture-pro-metadata-${Date.now()}.json`, saveAs: true })
      .finally(() => setTimeout(() => URL.revokeObjectURL(url), 60_000));
  };

  return (
    <div className="acp-app acp-noise history">
      <div className="history-shell">
        <div className="history-head">
          <div className="logo"><IconMic /></div>
          <div>
            <h1>Recordings</h1>
            <div className="subtitle">
              {usage.count} clip{usage.count === 1 ? '' : 's'} · {formatBytes(usage.used)}
              {usage.quota ? ` of ~${formatBytes(usage.quota)} available` : ''}
            </div>
          </div>
        </div>

        <div className="toolbar acp-fadein" data-testid="history-toolbar">
          <div className="search-wrap">
            <IconSearch />
            <input
              className="acp-input"
              placeholder="Search by name, tab, or URL…"
              value={q}
              data-testid="history-search"
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="acp-select"
            value={sort}
            data-testid="history-sort"
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="longest">Longest</option>
            <option value="largest">Largest</option>
            <option value="name">Name A–Z</option>
          </select>
          <button
            className={`acp-btn ${favOnly ? 'primary' : ''}`}
            data-testid="history-fav-filter"
            onClick={() => setFavOnly((v) => !v)}
          >
            <IconStar filled={favOnly} /> Favorites
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="acp-btn" data-testid="history-export" onClick={exportMetadata}>
              <IconDownload /> Export
            </button>
            <button
              className="acp-btn"
              data-testid="history-import"
              onClick={() => importRef.current?.click()}
            >
              <IconUpload /> Import
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importMetadata(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {items === null && (
          <div className="grid-cards">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-card acp-skeleton" />
            ))}
          </div>
        )}

        {items !== null && filtered.length === 0 && (
          <EmptyState hasAny={items.length > 0} onReset={() => { setQ(''); setFavOnly(false); }} />
        )}

        {items !== null && filtered.length > 0 && (
          <div className="grid-cards" data-testid="history-grid">
            {filtered.map((r) => (
              <RecordingCard key={r.id} rec={r} onChange={refresh} onTrim={() => setTrimTarget(r)} />
            ))}
          </div>
        )}
      </div>

      {trimTarget && (
        <TrimEditor
          recId={trimTarget.id}
          recName={trimTarget.name}
          onClose={() => setTrimTarget(null)}
          onSaved={() => {
            setTrimTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ hasAny, onReset }: { hasAny: boolean; onReset: () => void }) {
  return (
    <div className="empty-state acp-fadein" data-testid="history-empty">
      <div className="icon"><IconMic /></div>
      <h3>{hasAny ? 'No recordings match your filters' : 'Your studio is empty'}</h3>
      <p style={{ marginBottom: 16 }}>
        {hasAny
          ? 'Try clearing the search or turning off Favorites-only.'
          : 'Open the extension popup and hit record to capture a tab.'}
      </p>
      {hasAny && (
        <button className="acp-btn primary" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}

function RecordingCard({
  rec,
  onChange,
  onTrim,
}: {
  rec: RecordingMeta;
  onChange: () => void;
  onTrim: () => void;
}) {
  const [name, setName] = useState(rec.name);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    setLoading(true);
    getRecording(rec.id).then((full) => {
      if (full && full.blob.size > 0) {
        url = URL.createObjectURL(full.blob);
        setAudioUrl(url);
      }
      setLoading(false);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [rec.id]);

  const commitName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === rec.name) return;
    await updateRecordingMeta(rec.id, { name: trimmed });
    onChange();
  };

  const download = async () => {
    const full = await getRecording(rec.id);
    if (!full || full.blob.size === 0) {
      alert('This entry is metadata only — the audio blob is not stored locally.');
      return;
    }
    const url = URL.createObjectURL(full.blob);
    chrome.downloads
      .download({ url, filename: full.name, saveAs: true })
      .finally(() => setTimeout(() => URL.revokeObjectURL(url), 60_000));
  };

  const remove = async () => {
    if (!confirm(`Delete "${rec.name}"? This cannot be undone.`)) return;
    await deleteRecording(rec.id);
    onChange();
  };

  const toggleFav = async () => {
    await updateRecordingMeta(rec.id, { favorite: !rec.favorite });
    onChange();
  };

  return (
    <article className="card acp-fadein" data-testid={`history-card-${rec.id}`}>
      <div className="top">
        <div className="glyph"><IconMic /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <input
            className="name-input"
            value={name}
            data-testid={`history-name-${rec.id}`}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <div className="meta">
            {formatDuration(rec.durationMs)} · {formatBytes(rec.sizeBytes)} · {formatDate(rec.createdAt)}
          </div>
          <div className="tab-source" title={rec.tabUrl}>{rec.tabTitle}</div>
        </div>
      </div>
      <div className="badges">
        <span className="acp-chip">{rec.format.toUpperCase()}</span>
        <span className="acp-chip">{Math.round(rec.sampleRate / 1000)} kHz</span>
        <span className="acp-chip">{Math.round(rec.bitRate / 1000)} kbps</span>
      </div>
      {loading && <div className="acp-skeleton" style={{ height: 42 }} />}
      {!loading && audioUrl && (
        <audio controls preload="metadata" src={audioUrl} data-testid={`history-audio-${rec.id}`} />
      )}
      {!loading && !audioUrl && (
        <div className="acp-chip" style={{ color: 'var(--warn)' }}>
          Metadata only · audio not available
        </div>
      )}
      <div className="row">
        <button className="acp-btn ghost" onClick={toggleFav} data-testid={`history-fav-${rec.id}`}>
          <IconStar filled={rec.favorite} style={{ color: rec.favorite ? 'var(--brand)' : undefined }} />
          {rec.favorite ? 'Favorited' : 'Favorite'}
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="acp-btn"
            onClick={onTrim}
            disabled={!audioUrl}
            title={audioUrl ? 'Trim this recording' : 'Audio not available locally'}
            data-testid={`history-trim-${rec.id}`}
          >
            <IconScissors /> Trim
          </button>
          <button className="acp-btn" onClick={download} data-testid={`history-dl-${rec.id}`}>
            <IconDownload /> Save
          </button>
          <button className="acp-btn danger" onClick={remove} data-testid={`history-del-${rec.id}`}>
            <IconTrash />
          </button>
        </div>
      </div>
    </article>
  );
}
