import { useEffect, useState } from 'react';
import { getStatus, onStatusChange } from '@/storage/prefs';
import type { LiveRecordingStatus } from '@/types';

const initial: LiveRecordingStatus = {
  state: 'idle',
  startedAt: null,
  pausedAt: null,
  accumulatedMs: 0,
  tabId: null,
  tabTitle: '',
  tabUrl: '',
  level: 0,
};

export function useLiveStatus(): LiveRecordingStatus {
  const [status, setStatus] = useState<LiveRecordingStatus>(initial);

  useEffect(() => {
    let mounted = true;
    getStatus().then((s) => mounted && setStatus(s));
    const off = onStatusChange((s) => setStatus(s));
    return () => {
      mounted = false;
      off();
    };
  }, []);
  return status;
}

export function useElapsed(status: LiveRecordingStatus): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (status.state !== 'recording') return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [status.state]);
  if (status.state === 'paused') return status.accumulatedMs;
  if (status.state === 'recording' && status.startedAt) {
    return status.accumulatedMs + (now - status.startedAt);
  }
  return status.accumulatedMs;
}
