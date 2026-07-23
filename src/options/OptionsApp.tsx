import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { getSettings, resetSettings, setSettings } from '@/storage/prefs';
import { clearAll, getUsage } from '@/storage/db';
import { formatBytes } from '@/utils/format';
import { DEFAULT_SETTINGS, QUALITY_PRESETS } from '@/utils/constants';
import type { Settings, StorageUsage, ThemeMode } from '@/types';
import { IconMic, IconTrash } from '@/components/Icon';

const THEMES: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'amoled', label: 'AMOLED' },
  { key: 'system', label: 'System' },
];

export function OptionsApp() {
  useTheme();
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [usage, setUsage] = useState<StorageUsage>({ used: 0, quota: 0, count: 0 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setS);
    getUsage().then(setUsage);
  }, []);

  const update = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = await setSettings({ [key]: value } as Partial<Settings>);
    setS(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const commands = useCommands();

  return (
    <div className="acp-app acp-noise options">
      <div className="options-shell">
        <div className="head">
          <div className="logo"><IconMic /></div>
          <div>
            <h1>Settings</h1>
            <div className="subtitle">Configure Audio Capture Pro to match your workflow.</div>
          </div>
          <div style={{ marginLeft: 'auto', color: 'var(--brand)', fontSize: 13 }}>
            {saved ? 'Saved' : ''}
          </div>
        </div>

        <div className="grid">
          <section className="acp-card opt-card" data-testid="options-appearance">
            <h2 className="opt-title">Appearance</h2>
            <p className="opt-desc">Choose a theme that feels great to work in.</p>
            <div className="theme-picker">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  className={`theme-tile ${s.theme === t.key ? 'active' : ''}`}
                  data-mode={t.key}
                  data-testid={`options-theme-${t.key}`}
                  onClick={() => update('theme', t.key)}
                >
                  <div className="sample" />
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section className="acp-card opt-card" data-testid="options-audio">
            <h2 className="opt-title">Audio</h2>
            <p className="opt-desc">Format and quality of tab audio captured.</p>
            <div className="opt-row">
              <div>
                <label htmlFor="fmt">Format</label>
                <div className="desc">WebM Opus is lightweight. WAV is uncompressed.</div>
              </div>
              <div className="field">
                <select id="fmt" className="acp-select" data-testid="options-format"
                  value={s.format} onChange={(e) => update('format', e.target.value as Settings['format'])}>
                  <option value="webm">WebM (Opus)</option>
                  <option value="wav">WAV (PCM 16-bit)</option>
                </select>
              </div>
            </div>
            <div className="opt-row">
              <div>
                <label htmlFor="q">Quality</label>
                <div className="desc">Higher settings use more CPU and storage.</div>
              </div>
              <div className="field">
                <select id="q" className="acp-select" data-testid="options-quality"
                  value={s.quality} onChange={(e) => update('quality', e.target.value as Settings['quality'])}>
                  {(Object.keys(QUALITY_PRESETS) as (keyof typeof QUALITY_PRESETS)[]).map((k) => (
                    <option key={k} value={k}>{QUALITY_PRESETS[k].label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="opt-row">
              <div>
                <label>Keep tab audible while recording</label>
                <div className="desc">Continue to play tab audio through your speakers.</div>
              </div>
              <div className={`acp-switch ${s.keepTabAudible ? 'on' : ''}`} role="switch"
                aria-checked={s.keepTabAudible}
                data-testid="options-keepaudible"
                onClick={() => update('keepTabAudible', !s.keepTabAudible)} />
            </div>
          </section>

          <section className="acp-card opt-card" data-testid="options-files">
            <h2 className="opt-title">Files & History</h2>
            <p className="opt-desc">How new recordings are named and how many to keep.</p>
            <div className="opt-row">
              <div>
                <label htmlFor="fn">Default filename</label>
                <div className="desc">
                  Tokens: <span className="kbd">{'{date}'}</span> <span className="kbd">{'{time}'}</span>{' '}
                  <span className="kbd">{'{tab}'}</span> <span className="kbd">{'{timestamp}'}</span>
                </div>
              </div>
              <div className="field">
                <input id="fn" className="acp-input" value={s.defaultFilename}
                  data-testid="options-filename"
                  onChange={(e) => update('defaultFilename', e.target.value)} />
              </div>
            </div>
            <div className="opt-row">
              <div>
                <label htmlFor="hl">History limit</label>
                <div className="desc">Older non-favourite clips are pruned automatically.</div>
              </div>
              <div className="field">
                <input id="hl" type="number" min={1} max={1000} className="acp-input"
                  value={s.historyLimit}
                  data-testid="options-history-limit"
                  onChange={(e) => update('historyLimit', Math.max(1, Number(e.target.value) || 1))} />
              </div>
            </div>
            <div className="opt-row">
              <div>
                <label htmlFor="sl">Storage limit (MB)</label>
                <div className="desc">
                  Currently used: {formatBytes(usage.used)} across {usage.count} clip
                  {usage.count === 1 ? '' : 's'}
                  {usage.quota ? ` · Browser quota: ${formatBytes(usage.quota)}` : ''}
                </div>
              </div>
              <div className="field">
                <input id="sl" type="number" min={16} max={10240} className="acp-input"
                  value={s.storageLimitMB}
                  data-testid="options-storage-limit"
                  onChange={(e) => update('storageLimitMB', Math.max(16, Number(e.target.value) || 16))} />
              </div>
            </div>
            <div className="opt-row">
              <div>
                <label>Auto save</label>
                <div className="desc">Save every stop to history immediately.</div>
              </div>
              <div className={`acp-switch ${s.autoSave ? 'on' : ''}`} role="switch" aria-checked={s.autoSave}
                data-testid="options-autosave"
                onClick={() => update('autoSave', !s.autoSave)} />
            </div>
            <div className="opt-row">
              <div>
                <label>Notifications</label>
                <div className="desc">Show OS notifications for start / stop / errors.</div>
              </div>
              <div className={`acp-switch ${s.notifications ? 'on' : ''}`} role="switch"
                aria-checked={s.notifications}
                data-testid="options-notifications"
                onClick={() => update('notifications', !s.notifications)} />
            </div>
          </section>

          <section className="acp-card opt-card" data-testid="options-shortcuts">
            <h2 className="opt-title">Keyboard shortcuts</h2>
            <p className="opt-desc">
              Manage shortcuts at{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); }}>
                chrome://extensions/shortcuts
              </a>.
            </p>
            {commands.map((c) => (
              <div className="opt-row" key={c.name}>
                <div>
                  <label>{c.description || c.name}</label>
                  <div className="desc">Action id: <span className="kbd">{c.name}</span></div>
                </div>
                <div className="field" style={{ textAlign: 'right' }}>
                  <span className="kbd">{c.shortcut || 'Not set'}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="acp-card opt-card" data-testid="options-danger">
            <h2 className="opt-title">Data</h2>
            <p className="opt-desc">Reset settings or wipe all recordings from local storage.</p>
            <div className="opt-actions">
              <button className="acp-btn" data-testid="options-reset"
                onClick={async () => { const r = await resetSettings(); setS(r); }}>
                Reset settings
              </button>
              <button className="acp-btn danger" data-testid="options-clear"
                onClick={async () => {
                  if (confirm('Delete every recording from local storage? This cannot be undone.')) {
                    await clearAll();
                    setUsage(await getUsage());
                  }
                }}>
                <IconTrash /> Delete all recordings
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function useCommands(): chrome.commands.Command[] {
  const [c, setC] = useState<chrome.commands.Command[]>([]);
  useEffect(() => {
    chrome.commands?.getAll?.((cmds) => setC(cmds));
  }, []);
  return c;
}
