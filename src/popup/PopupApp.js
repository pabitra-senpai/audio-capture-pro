import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useLiveStatus, useElapsed } from '@/hooks/useStatus';
import { useTheme } from '@/hooks/useTheme';
import { LevelMeter } from '@/components/LevelMeter';
import { IconAlert, IconDot, IconDownload, IconHistory, IconMic, IconPause, IconPip, IconPlay, IconSettings, IconStar, IconStop, IconTrash, } from '@/components/Icon';
import { send } from '@/services/messaging';
import { deleteRecording, getRecording, getUsage, listRecordings, updateRecordingMeta } from '@/storage/db';
import { formatBytes, formatDate, formatDuration } from '@/utils/format';
import { closePip, isPipOpen, isPipSupported, openPip } from './pip';
function TimerDisplay({ ms }) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    const mm = pad(m);
    const ss = pad(s);
    const cs = pad(Math.floor((ms % 1000) / 10));
    return (_jsxs("div", { className: "timer", "data-testid": "popup-timer", children: [h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`, _jsxs("span", { className: "ms", children: [".", cs] })] }));
}
async function downloadRecording(id) {
    const rec = await getRecording(id);
    if (!rec)
        return;
    const url = URL.createObjectURL(rec.blob);
    try {
        await chrome.downloads.download({ url, filename: rec.name, saveAs: false });
    }
    finally {
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
}
export function PopupApp() {
    useTheme();
    const status = useLiveStatus();
    const elapsed = useElapsed(status);
    const [recent, setRecent] = useState([]);
    const [usage, setUsage] = useState({ used: 0, quota: 0, count: 0 });
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
            if (!mounted)
                return;
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
    const isBusy = status.state === 'recording' || status.state === 'paused' || status.state === 'starting' || status.state === 'stopping';
    const activeTab = useActiveTab(status);
    const tabTitle = status.tabTitle || activeTab.title;
    const tabUrl = status.tabUrl || activeTab.url;
    const favicon = activeTab.favIconUrl;
    const captureBlocked = !tabUrl || /^(chrome|edge|about|chrome-extension):/i.test(tabUrl);
    const onMain = () => {
        if (status.state === 'idle' || status.state === 'error')
            void send({ type: 'START_RECORDING' });
        else
            void send({ type: 'STOP_RECORDING' });
    };
    return (_jsxs("div", { className: "popup acp-fadein", children: [_jsxs("header", { className: "brand", children: [_jsxs("div", { className: "brand-mark", children: [_jsx("div", { className: "logo", "aria-hidden": true, children: _jsx(IconMic, {}) }), _jsxs("div", { children: [_jsx("div", { className: "brand-title", children: "Audio Capture" }), _jsx("div", { className: "brand-sub", children: "Pro \u00B7 v1.0" })] })] }), _jsxs("div", { className: "brand-actions", children: [pipSupported && (_jsx("button", { className: `acp-btn icon ghost ${pipOpen ? 'active' : ''}`, "data-testid": "popup-toggle-pip", title: pipOpen ? 'Close floating indicator' : 'Float recording indicator', onClick: togglePip, children: _jsx(IconPip, {}) })), _jsx("button", { className: "acp-btn icon ghost", "data-testid": "popup-open-history", title: "Open history", onClick: () => send({ type: 'OPEN_HISTORY' }), children: _jsx(IconHistory, {}) }), _jsx("button", { className: "acp-btn icon ghost", "data-testid": "popup-open-settings", title: "Open settings", onClick: () => send({ type: 'OPEN_OPTIONS' }), children: _jsx(IconSettings, {}) })] })] }), _jsxs("section", { className: "tab-card", "data-testid": "popup-tab-card", children: [_jsx("div", { className: "favicon", children: favicon ? _jsx("img", { src: favicon, alt: "" }) : _jsx(IconMic, {}) }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { className: "title", title: tabTitle, children: tabTitle || 'No active tab' }), _jsx("div", { className: "url", title: tabUrl, children: tabUrl || 'Open a tab to begin capturing audio' })] }), _jsx("div", { className: `state ${stateBadge.cls}`, children: stateBadge.label })] }), status.state === 'error' && status.errorMessage && (_jsxs("div", { className: "error-banner", role: "alert", "data-testid": "popup-error-banner", children: [_jsx(IconAlert, {}), _jsx("div", { children: status.errorMessage })] })), _jsxs("section", { className: "rec-stage", children: [_jsx(TimerDisplay, { ms: elapsed }), _jsxs("div", { className: "caption", children: [status.state === 'recording' && 'Live tab capture', status.state === 'paused' && 'Paused — press resume to continue', status.state === 'idle' && 'Press record to capture this tab', status.state === 'starting' && 'Starting capture…', status.state === 'stopping' && 'Saving your recording…', status.state === 'error' && 'Recording halted — try again'] }), _jsx("div", { className: "meter-wrap", children: _jsx(LevelMeter, { level: status.level, state: status.state }) }), _jsxs("div", { className: "main-btn-wrap", children: [_jsx("button", { className: "side-btn", "data-testid": "popup-pause-resume-btn", disabled: !(status.state === 'recording' || status.state === 'paused'), title: status.state === 'paused' ? 'Resume' : 'Pause', onClick: () => status.state === 'paused'
                                    ? send({ type: 'RESUME_RECORDING' })
                                    : send({ type: 'PAUSE_RECORDING' }), children: status.state === 'paused' ? _jsx(IconPlay, {}) : _jsx(IconPause, {}) }), _jsxs("button", { className: `main-btn ${status.state === 'recording' ? 'recording' : ''} ${status.state === 'paused' ? 'paused' : ''} ${captureBlocked && status.state === 'idle' ? 'disabled' : ''}`, "data-testid": "popup-record-btn", disabled: captureBlocked && (status.state === 'idle' || status.state === 'error'), onClick: onMain, "aria-label": isBusy ? 'Stop recording' : 'Start recording', children: [_jsx("span", { className: "ring" }), isBusy ? _jsx(IconStop, {}) : _jsx(IconDot, {})] }), _jsx("button", { className: "side-btn", "data-testid": "popup-stop-btn", disabled: !isBusy, title: "Stop", onClick: () => send({ type: 'STOP_RECORDING' }), children: _jsx(IconStop, {}) })] }), _jsx("div", { className: "hint-wrap", children: _jsx("div", { className: "hint", children: "\u2325\u21E7R record \u00B7 \u2325\u21E7P pause \u00B7 \u2325\u21E7H history" }) })] }), _jsxs("div", { className: "section-title", children: [_jsx("span", { children: "Recent" }), _jsx("button", { "data-testid": "popup-view-all", onClick: () => send({ type: 'OPEN_HISTORY' }), children: "View all \u2192" })] }), _jsxs("section", { className: "recent", "data-testid": "popup-recent-list", children: [recent.length === 0 && (_jsx("div", { className: "recent-empty", children: "No recordings yet \u2014 hit record to make your first one." })), recent.map((r) => (_jsx(RecentRow, { r: r, onRefresh: () => setRefreshTick((t) => t + 1) }, r.id)))] }), _jsxs("footer", { className: "footer", children: [_jsxs("div", { className: "usage", "data-testid": "popup-storage-usage", children: [usage.count, " clip", usage.count === 1 ? '' : 's', " \u00B7 ", formatBytes(usage.used)] }), _jsx("a", { href: "#", onClick: (e) => { e.preventDefault(); send({ type: 'OPEN_OPTIONS' }); }, children: "Manage settings" })] })] }));
}
function RecentRow({ r, onRefresh }) {
    const [fav, setFav] = useState(r.favorite);
    return (_jsxs("div", { className: "recent-row", "data-testid": `popup-recent-${r.id}`, children: [_jsx("div", { className: "glyph", children: _jsx(IconMic, {}) }), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { className: "name", title: r.name, children: r.name }), _jsxs("div", { className: "meta", children: [formatDuration(r.durationMs), " \u00B7 ", formatBytes(r.sizeBytes), " \u00B7 ", formatDate(r.createdAt)] })] }), _jsxs("div", { className: "actions", children: [_jsx("button", { className: "acp-btn icon ghost", title: "Favorite", "data-testid": `recent-fav-${r.id}`, onClick: async () => {
                            const next = !fav;
                            setFav(next);
                            await updateRecordingMeta(r.id, { favorite: next });
                            onRefresh();
                        }, children: _jsx(IconStar, { filled: fav, style: { color: fav ? 'var(--brand)' : undefined } }) }), _jsx("button", { className: "acp-btn icon ghost", title: "Download", "data-testid": `recent-dl-${r.id}`, onClick: () => downloadRecording(r.id), children: _jsx(IconDownload, {}) }), _jsx("button", { className: "acp-btn icon ghost", title: "Delete", "data-testid": `recent-del-${r.id}`, onClick: async () => { await deleteRecording(r.id); onRefresh(); }, children: _jsx(IconTrash, {}) })] })] }));
}
function useActiveTab(status) {
    const [tab, setTab] = useState({
        title: status.tabTitle,
        url: status.tabUrl,
    });
    useEffect(() => {
        let mounted = true;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const t = tabs[0];
            if (!mounted || !t)
                return;
            setTab({ title: t.title ?? '', url: t.url ?? '', favIconUrl: t.favIconUrl });
        });
        return () => {
            mounted = false;
        };
    }, []);
    return tab;
}
