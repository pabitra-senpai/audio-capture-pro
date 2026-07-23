import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { deleteRecording, getRecording, getUsage, listRecordings, putRecording, updateRecordingMeta, } from '@/storage/db';
import { formatBytes, formatDate, formatDuration, uuid } from '@/utils/format';
import { IconDownload, IconMic, IconScissors, IconSearch, IconStar, IconTrash, IconUpload, } from '@/components/Icon';
import { TrimEditor } from './TrimEditor';
export function HistoryApp() {
    useTheme();
    const [items, setItems] = useState(null);
    const [usage, setUsage] = useState({ used: 0, quota: 0, count: 0 });
    const [q, setQ] = useState('');
    const [sort, setSort] = useState('newest');
    const [favOnly, setFavOnly] = useState(false);
    const [trimTarget, setTrimTarget] = useState(null);
    const importRef = useRef(null);
    const refresh = async () => {
        const [list, u] = await Promise.all([listRecordings(), getUsage()]);
        setItems(list);
        setUsage(u);
    };
    useEffect(() => {
        refresh();
    }, []);
    const filtered = useMemo(() => {
        if (!items)
            return [];
        const query = q.trim().toLowerCase();
        let list = items.filter((r) => {
            if (favOnly && !r.favorite)
                return false;
            if (!query)
                return true;
            return (r.name.toLowerCase().includes(query) ||
                r.tabTitle.toLowerCase().includes(query) ||
                r.tabUrl.toLowerCase().includes(query));
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
    const importMetadata = async (file) => {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!Array.isArray(data))
                throw new Error('Expected an array');
            for (const rec of data) {
                const existing = await getRecording(rec.id);
                if (existing) {
                    await updateRecordingMeta(existing.id, {
                        name: rec.name ?? existing.name,
                        favorite: rec.favorite ?? existing.favorite,
                        tabTitle: rec.tabTitle ?? existing.tabTitle,
                        tabUrl: rec.tabUrl ?? existing.tabUrl,
                    });
                }
                else {
                    const placeholderBlob = new Blob([], { type: rec.mimeType || 'audio/webm' });
                    await putRecording({
                        ...rec,
                        id: rec.id || uuid(),
                        createdAt: rec.createdAt || Date.now(),
                        durationMs: rec.durationMs || 0,
                        sizeBytes: rec.sizeBytes || 0,
                        format: rec.format || 'webm',
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
        }
        catch (err) {
            alert(`Import failed: ${err instanceof Error ? err.message : err}`);
        }
    };
    const exportMetadata = () => {
        if (!items)
            return;
        const json = JSON.stringify(items, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        chrome.downloads
            .download({ url, filename: `audio-capture-pro-metadata-${Date.now()}.json`, saveAs: true })
            .finally(() => setTimeout(() => URL.revokeObjectURL(url), 60_000));
    };
    return (_jsxs("div", { className: "acp-app acp-noise history", children: [_jsxs("div", { className: "history-shell", children: [_jsxs("div", { className: "history-head", children: [_jsx("div", { className: "logo", children: _jsx(IconMic, {}) }), _jsxs("div", { children: [_jsx("h1", { children: "Recordings" }), _jsxs("div", { className: "subtitle", children: [usage.count, " clip", usage.count === 1 ? '' : 's', " \u00B7 ", formatBytes(usage.used), usage.quota ? ` of ~${formatBytes(usage.quota)} available` : ''] })] })] }), _jsxs("div", { className: "toolbar acp-fadein", "data-testid": "history-toolbar", children: [_jsxs("div", { className: "search-wrap", children: [_jsx(IconSearch, {}), _jsx("input", { className: "acp-input", placeholder: "Search by name, tab, or URL\u2026", value: q, "data-testid": "history-search", onChange: (e) => setQ(e.target.value) })] }), _jsxs("select", { className: "acp-select", value: sort, "data-testid": "history-sort", onChange: (e) => setSort(e.target.value), children: [_jsx("option", { value: "newest", children: "Newest first" }), _jsx("option", { value: "oldest", children: "Oldest first" }), _jsx("option", { value: "longest", children: "Longest" }), _jsx("option", { value: "largest", children: "Largest" }), _jsx("option", { value: "name", children: "Name A\u2013Z" })] }), _jsxs("button", { className: `acp-btn ${favOnly ? 'primary' : ''}`, "data-testid": "history-fav-filter", onClick: () => setFavOnly((v) => !v), children: [_jsx(IconStar, { filled: favOnly }), " Favorites"] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("button", { className: "acp-btn", "data-testid": "history-export", onClick: exportMetadata, children: [_jsx(IconDownload, {}), " Export"] }), _jsxs("button", { className: "acp-btn", "data-testid": "history-import", onClick: () => importRef.current?.click(), children: [_jsx(IconUpload, {}), " Import"] }), _jsx("input", { ref: importRef, type: "file", accept: "application/json", style: { display: 'none' }, onChange: (e) => {
                                            const file = e.target.files?.[0];
                                            if (file)
                                                importMetadata(file);
                                            e.target.value = '';
                                        } })] })] }), items === null && (_jsx("div", { className: "grid-cards", children: Array.from({ length: 6 }).map((_, i) => (_jsx("div", { className: "skeleton-card acp-skeleton" }, i))) })), items !== null && filtered.length === 0 && (_jsx(EmptyState, { hasAny: items.length > 0, onReset: () => { setQ(''); setFavOnly(false); } })), items !== null && filtered.length > 0 && (_jsx("div", { className: "grid-cards", "data-testid": "history-grid", children: filtered.map((r) => (_jsx(RecordingCard, { rec: r, onChange: refresh, onTrim: () => setTrimTarget(r) }, r.id))) }))] }), trimTarget && (_jsx(TrimEditor, { recId: trimTarget.id, recName: trimTarget.name, onClose: () => setTrimTarget(null), onSaved: () => {
                    setTrimTarget(null);
                    refresh();
                } }))] }));
}
function EmptyState({ hasAny, onReset }) {
    return (_jsxs("div", { className: "empty-state acp-fadein", "data-testid": "history-empty", children: [_jsx("div", { className: "icon", children: _jsx(IconMic, {}) }), _jsx("h3", { children: hasAny ? 'No recordings match your filters' : 'Your studio is empty' }), _jsx("p", { style: { marginBottom: 16 }, children: hasAny
                    ? 'Try clearing the search or turning off Favorites-only.'
                    : 'Open the extension popup and hit record to capture a tab.' }), hasAny && (_jsx("button", { className: "acp-btn primary", onClick: onReset, children: "Clear filters" }))] }));
}
function RecordingCard({ rec, onChange, onTrim, }) {
    const [name, setName] = useState(rec.name);
    const [audioUrl, setAudioUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let url = null;
        setLoading(true);
        getRecording(rec.id).then((full) => {
            if (full && full.blob.size > 0) {
                url = URL.createObjectURL(full.blob);
                setAudioUrl(url);
            }
            setLoading(false);
        });
        return () => {
            if (url)
                URL.revokeObjectURL(url);
        };
    }, [rec.id]);
    const commitName = async () => {
        const trimmed = name.trim();
        if (!trimmed || trimmed === rec.name)
            return;
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
        if (!confirm(`Delete "${rec.name}"? This cannot be undone.`))
            return;
        await deleteRecording(rec.id);
        onChange();
    };
    const toggleFav = async () => {
        await updateRecordingMeta(rec.id, { favorite: !rec.favorite });
        onChange();
    };
    return (_jsxs("article", { className: "card acp-fadein", "data-testid": `history-card-${rec.id}`, children: [_jsxs("div", { className: "top", children: [_jsx("div", { className: "glyph", children: _jsx(IconMic, {}) }), _jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [_jsx("input", { className: "name-input", value: name, "data-testid": `history-name-${rec.id}`, onChange: (e) => setName(e.target.value), onBlur: commitName, onKeyDown: (e) => e.key === 'Enter' && e.target.blur() }), _jsxs("div", { className: "meta", children: [formatDuration(rec.durationMs), " \u00B7 ", formatBytes(rec.sizeBytes), " \u00B7 ", formatDate(rec.createdAt)] }), _jsx("div", { className: "tab-source", title: rec.tabUrl, children: rec.tabTitle })] })] }), _jsxs("div", { className: "badges", children: [_jsx("span", { className: "acp-chip", children: rec.format.toUpperCase() }), _jsxs("span", { className: "acp-chip", children: [Math.round(rec.sampleRate / 1000), " kHz"] }), _jsxs("span", { className: "acp-chip", children: [Math.round(rec.bitRate / 1000), " kbps"] })] }), loading && _jsx("div", { className: "acp-skeleton", style: { height: 42 } }), !loading && audioUrl && (_jsx("audio", { controls: true, preload: "metadata", src: audioUrl, "data-testid": `history-audio-${rec.id}` })), !loading && !audioUrl && (_jsx("div", { className: "acp-chip", style: { color: 'var(--warn)' }, children: "Metadata only \u00B7 audio not available" })), _jsxs("div", { className: "row", children: [_jsxs("button", { className: "acp-btn ghost", onClick: toggleFav, "data-testid": `history-fav-${rec.id}`, children: [_jsx(IconStar, { filled: rec.favorite, style: { color: rec.favorite ? 'var(--brand)' : undefined } }), rec.favorite ? 'Favorited' : 'Favorite'] }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsxs("button", { className: "acp-btn", onClick: onTrim, disabled: !audioUrl, title: audioUrl ? 'Trim this recording' : 'Audio not available locally', "data-testid": `history-trim-${rec.id}`, children: [_jsx(IconScissors, {}), " Trim"] }), _jsxs("button", { className: "acp-btn", onClick: download, "data-testid": `history-dl-${rec.id}`, children: [_jsx(IconDownload, {}), " Save"] }), _jsx("button", { className: "acp-btn danger", onClick: remove, "data-testid": `history-del-${rec.id}`, children: _jsx(IconTrash, {}) })] })] })] }));
}
