import { DB_NAME, DB_VERSION, STORE_RECORDINGS } from '@/utils/constants';
let dbPromise = null;
function openDB() {
    if (dbPromise)
        return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
                const store = db.createObjectStore(STORE_RECORDINGS, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
                store.createIndex('favorite', 'favorite', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}
function tx(mode, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
        const t = db.transaction(STORE_RECORDINGS, mode);
        const store = t.objectStore(STORE_RECORDINGS);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}
export async function putRecording(rec) {
    await tx('readwrite', (s) => s.put(rec));
}
export async function getRecording(id) {
    return tx('readonly', (s) => s.get(id));
}
export async function deleteRecording(id) {
    await tx('readwrite', (s) => s.delete(id));
}
export async function updateRecordingMeta(id, patch) {
    const existing = await getRecording(id);
    if (!existing)
        return undefined;
    const updated = { ...existing, ...patch };
    await putRecording(updated);
    return updated;
}
export async function listRecordings() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_RECORDINGS, 'readonly');
        const store = t.objectStore(STORE_RECORDINGS);
        const results = [];
        const req = store.openCursor(null, 'prev');
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                const { blob: _b, ...meta } = cursor.value;
                results.push(meta);
                cursor.continue();
            }
            else {
                resolve(results.sort((a, b) => b.createdAt - a.createdAt));
            }
        };
        req.onerror = () => reject(req.error);
    });
}
export async function clearAll() {
    await tx('readwrite', (s) => s.clear());
}
export async function getUsage() {
    const list = await listRecordings();
    const used = list.reduce((s, r) => s + r.sizeBytes, 0);
    let quota = 0;
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            quota = est.quota ?? 0;
        }
    }
    catch {
        quota = 0;
    }
    return { used, quota, count: list.length };
}
export async function pruneToLimit(limit) {
    const list = await listRecordings();
    const nonFavorites = list.filter((r) => !r.favorite);
    const overflow = list.length - limit;
    if (overflow <= 0)
        return 0;
    const toDelete = nonFavorites.slice(-overflow);
    await Promise.all(toDelete.map((r) => deleteRecording(r.id)));
    return toDelete.length;
}
