export function formatDuration(ms) {
    if (!Number.isFinite(ms) || ms < 0)
        ms = 0;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    if (h > 0)
        return `${h}:${mm}:${ss}`;
    return `${mm}:${ss}`;
}
export function formatBytes(bytes) {
    if (!bytes)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
export function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
export function buildFilename(template, tabTitle) {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeTab = tabTitle.replace(/[^\p{L}\p{N}\-_. ]+/gu, '').slice(0, 60).trim() || 'untitled';
    return template
        .replaceAll('{date}', date)
        .replaceAll('{time}', time)
        .replaceAll('{tab}', safeTab)
        .replaceAll('{timestamp}', now.getTime().toString());
}
export function uuid() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
