import type { BgMessage } from '@/types';

export async function send(msg: BgMessage): Promise<void> {
  try {
    await chrome.runtime.sendMessage(msg);
  } catch {
    /* background may briefly be reloading */
  }
}
