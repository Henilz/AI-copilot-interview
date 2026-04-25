import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'AI Interview Co-Pilot',
  version: '0.1.0',
  description: 'Real-time interview coaching panel for Google Meet',
  permissions: ['sidePanel', 'storage', 'activeTab', 'tabs'],
  host_permissions: [
    'https://meet.google.com/*',
  ],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'sidepanel.html',
  },
  action: {
    default_title: 'Open AI Interview Co-Pilot',
  },
  content_scripts: [
    {
      matches: ['https://meet.google.com/*'],
      js: ['src/content/meet-detector.ts'],
    },
  ],
})
