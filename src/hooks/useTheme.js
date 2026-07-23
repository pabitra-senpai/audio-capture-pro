import { useEffect, useState } from 'react';
import { getSettings, onSettingsChange } from '@/storage/prefs';
export function useTheme() {
    const [theme, setTheme] = useState('system');
    useEffect(() => {
        let media = null;
        let mediaListener = null;
        const apply = (mode) => {
            setTheme(mode);
            const effective = mode === 'system'
                ? window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light'
                : mode;
            document.documentElement.dataset.theme = effective;
        };
        (async () => {
            const s = await getSettings();
            apply(s.theme);
        })();
        const off = onSettingsChange((s) => apply(s.theme));
        media = window.matchMedia('(prefers-color-scheme: dark)');
        mediaListener = () => {
            const html = document.documentElement;
            if (html.dataset.themeMode === 'system')
                apply('system');
        };
        media.addEventListener('change', mediaListener);
        return () => {
            off();
            if (media && mediaListener)
                media.removeEventListener('change', mediaListener);
        };
    }, []);
    return theme;
}
