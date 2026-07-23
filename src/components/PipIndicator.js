import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useElapsed, useLiveStatus } from '@/hooks/useStatus';
import { LevelMeter } from '@/components/LevelMeter';
import { IconClose, IconPause, IconPlay, IconStop } from '@/components/Icon';
import { send } from '@/services/messaging';
function pad(n) {
    return n.toString().padStart(2, '0');
}
function formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
/**
 * Compact status widget rendered inside a Document Picture-in-Picture window.
 * Reuses the same live-status hook as the popup, so it stays in sync via
 * chrome.storage.onChanged regardless of which tab is active.
 */
export function PipIndicator({ onCloseSelf }) {
    const status = useLiveStatus();
    const elapsed = useElapsed(status);
    const isPaused = status.state === 'paused';
    const isActive = status.state === 'recording' || isPaused;
    return (_jsxs("div", { className: "pip-widget", children: [_jsx("div", { className: `pip-dot ${status.state === 'recording' ? 'live' : ''} ${isPaused ? 'paused' : ''}` }), _jsxs("div", { className: "pip-info", children: [_jsx("div", { className: "pip-timer", children: formatElapsed(elapsed) }), _jsxs("div", { className: "pip-label", children: [status.state === 'recording' && 'Recording tab audio', isPaused && 'Paused', !isActive && 'Idle'] }), _jsx("div", { className: "pip-meter", children: _jsx(LevelMeter, { level: status.level, state: status.state, height: 18, bars: 18 }) })] }), _jsxs("div", { className: "pip-actions", children: [_jsx("button", { className: "acp-btn icon ghost", disabled: !isActive, title: isPaused ? 'Resume' : 'Pause', onClick: () => send({ type: isPaused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' }), children: isPaused ? _jsx(IconPlay, {}) : _jsx(IconPause, {}) }), _jsx("button", { className: "acp-btn icon ghost", disabled: !isActive, title: "Stop", onClick: () => send({ type: 'STOP_RECORDING' }), children: _jsx(IconStop, {}) }), _jsx("button", { className: "acp-btn icon ghost", title: "Close floating indicator", onClick: onCloseSelf, children: _jsx(IconClose, {}) })] })] }));
}
