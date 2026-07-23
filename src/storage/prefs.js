import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/utils/constants';
export async function getSettings() {
    const res = await chrome.storage.local.get(STORAGE_KEYS.settings);
    const stored = res[STORAGE_KEYS.settings];
    return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}
export async function setSettings(next) {
    const current = await getSettings();
    const merged = { ...current, ...next };
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: merged });
    return merged;
}
export async function resetSettings() {
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
}
const IDLE_STATUS = {
    state: 'idle',
    startedAt: null,
    pausedAt: null,
    accumulatedMs: 0,
    tabId: null,
    tabTitle: '',
    tabUrl: '',
    level: 0,
};
export async function getStatus() {
    const res = await chrome.storage.local.get(STORAGE_KEYS.status);
    return res[STORAGE_KEYS.status] ?? IDLE_STATUS;
}
export async function setStatus(next) {
    const current = await getStatus();
    const merged = { ...current, ...next };
    await chrome.storage.local.set({ [STORAGE_KEYS.status]: merged });
    return merged;
}
export async function resetStatus() {
    await chrome.storage.local.set({ [STORAGE_KEYS.status]: IDLE_STATUS });
    return IDLE_STATUS;
}
export function onStatusChange(cb) {
    const listener = (changes, area) => {
        if (area !== 'local')
            return;
        const ch = changes[STORAGE_KEYS.status];
        if (ch)
            cb(ch.newValue ?? IDLE_STATUS);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
}
export function onSettingsChange(cb) {
    const listener = (changes, area) => {
        if (area !== 'local')
            return;
        const ch = changes[STORAGE_KEYS.settings];
        if (ch)
            cb({ ...DEFAULT_SETTINGS, ...(ch.newValue ?? {}) });
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
}
