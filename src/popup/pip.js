import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { PipIndicator } from '@/components/PipIndicator';
let pipWindow = null;
let pipRoot = null;
/** Feature detection — Document PiP shipped in Chrome 116, same floor as this manifest. */
export function isPipSupported() {
    return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
}
export function isPipOpen() {
    return pipWindow !== null;
}
/** Copies every reachable stylesheet from this document into the PiP document. */
function copyStyles(target) {
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            if (sheet.href) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = sheet.href;
                target.head.appendChild(link);
            }
            else if (sheet.cssRules) {
                const style = document.createElement('style');
                style.textContent = Array.from(sheet.cssRules)
                    .map((rule) => rule.cssText)
                    .join('\n');
                target.head.appendChild(style);
            }
        }
        catch {
            // Cross-origin sheet (e.g. the imported Google Fonts sheet) — safe to skip,
            // it just means the PiP widget falls back to the system font for that piece.
        }
    }
}
/**
 * Opens (or focuses) the floating recording indicator as a real always-on-top
 * window via the Document Picture-in-Picture API. Must be called synchronously
 * from a user gesture (e.g. a button onClick) to satisfy the API's activation
 * requirement — do not await anything before calling this.
 */
export async function openPip(onClosedByUser) {
    const dpip = window.documentPictureInPicture;
    if (!dpip)
        return false;
    if (pipWindow) {
        pipWindow.focus();
        return true;
    }
    const win = await dpip.requestWindow({ width: 300, height: 100 });
    pipWindow = win;
    win.document.body.style.margin = '0';
    win.document.body.style.background = 'var(--bg-0, #0f1013)';
    copyStyles(win.document);
    const container = win.document.createElement('div');
    container.id = 'pip-root';
    win.document.body.appendChild(container);
    pipRoot = createRoot(container);
    pipRoot.render(createElement(PipIndicator, { onCloseSelf: closePip }));
    win.addEventListener('pagehide', () => {
        pipRoot?.unmount();
        pipRoot = null;
        pipWindow = null;
        onClosedByUser();
    }, { once: true });
    return true;
}
export function closePip() {
    pipWindow?.close();
}
