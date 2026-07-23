import { NOTIFY_ICON } from '@/utils/constants';
import { getSettings } from '@/storage/prefs';

let counter = 0;

export async function notify(
  title: string,
  message: string,
  opts: { silent?: boolean } = {},
): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.notifications) return;
    const id = `acp-${Date.now()}-${counter++}`;
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL(NOTIFY_ICON),
      title,
      message,
      priority: opts.silent ? 0 : 1,
      silent: opts.silent ?? false,
    });
  } catch {
    /* notification failures are non-fatal */
  }
}
