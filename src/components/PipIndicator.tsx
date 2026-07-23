import { useElapsed, useLiveStatus } from '@/hooks/useStatus';
import { LevelMeter } from '@/components/LevelMeter';
import { IconClose, IconPause, IconPlay, IconStop } from '@/components/Icon';
import { send } from '@/services/messaging';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

interface Props {
  /** Called when the user explicitly dismisses the widget (not on natural window close). */
  onCloseSelf: () => void;
}

/**
 * Compact status widget rendered inside a Document Picture-in-Picture window.
 * Reuses the same live-status hook as the popup, so it stays in sync via
 * chrome.storage.onChanged regardless of which tab is active.
 */
export function PipIndicator({ onCloseSelf }: Props) {
  const status = useLiveStatus();
  const elapsed = useElapsed(status);
  const isPaused = status.state === 'paused';
  const isActive = status.state === 'recording' || isPaused;

  return (
    <div className="pip-widget">
      <div className={`pip-dot ${status.state === 'recording' ? 'live' : ''} ${isPaused ? 'paused' : ''}`} />
      <div className="pip-info">
        <div className="pip-timer">{formatElapsed(elapsed)}</div>
        <div className="pip-label">
          {status.state === 'recording' && 'Recording tab audio'}
          {isPaused && 'Paused'}
          {!isActive && 'Idle'}
        </div>
        <div className="pip-meter">
          <LevelMeter level={status.level} state={status.state} height={18} bars={18} />
        </div>
      </div>
      <div className="pip-actions">
        <button
          className="acp-btn icon ghost"
          disabled={!isActive}
          title={isPaused ? 'Resume' : 'Pause'}
          onClick={() => send({ type: isPaused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' })}
        >
          {isPaused ? <IconPlay /> : <IconPause />}
        </button>
        <button
          className="acp-btn icon ghost"
          disabled={!isActive}
          title="Stop"
          onClick={() => send({ type: 'STOP_RECORDING' })}
        >
          <IconStop />
        </button>
        <button className="acp-btn icon ghost" title="Close floating indicator" onClick={onCloseSelf}>
          <IconClose />
        </button>
      </div>
    </div>
  );
}
