import { useEffect, useState } from 'react';
import { getSettings, onSettingsChange } from '@/storage/prefs';
import type { ThemeMode } from '@/types';

export function useTheme(): ThemeMode {
  const [theme, setTheme] = useState<ThemeMode>('system');

  useEffect(() => {
    let media: MediaQueryList | null = null;
    let mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

    const apply = (mode: ThemeMode) => {
      setTheme(mode);
      const effective =
        mode === 'system'
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
      if (html.dataset.themeMode === 'system') apply('system');
    };
    media.addEventListener('change', mediaListener);

    return () => {
      off();
      if (media && mediaListener) media.removeEventListener('change', mediaListener);
    };
  }, []);

  return theme;
}
