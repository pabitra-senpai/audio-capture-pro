import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Audio Capture Pro',
  short_name: 'Audio Capture',
  version: '1.0.0',
  description:
    'Premium browser tab audio recorder — record, manage, and export high-quality tab audio.',
  minimum_chrome_version: '116',
  action: {
    default_popup: 'src/popup/popup.html',
    default_title: 'Audio Capture Pro',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  options_page: 'src/options/options.html',
  permissions: [
    'tabCapture',
    'offscreen',
    'storage',
    'notifications',
    'activeTab',
    'downloads',
    'tabs',
  ],
  commands: {
    'toggle-record': {
      suggested_key: { default: 'Alt+Shift+R', mac: 'Alt+Shift+R' },
      description: 'Start / Stop recording of the current tab',
    },
    'pause-resume': {
      suggested_key: { default: 'Alt+Shift+P', mac: 'Alt+Shift+P' },
      description: 'Pause / Resume the current recording',
    },
    'open-history': {
      suggested_key: { default: 'Alt+Shift+H', mac: 'Alt+Shift+H' },
      description: 'Open the recording history page',
    },
  },
  web_accessible_resources: [
    {
      resources: ['src/offscreen/offscreen.html', 'icons/*'],
      matches: ['<all_urls>'],
    },
  ],
});
