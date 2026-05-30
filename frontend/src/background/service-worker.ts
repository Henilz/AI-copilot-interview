// Service worker: configure the side panel so the action button opens it on Meet tabs.
// All WebSocket and speech recognition logic lives in the side panel itself.

const MEET_URL_PREFIX = 'https://meet.google.com/'

async function enablePanelForMeetTab(tabId: number) {
  await chrome.sidePanel
    .setOptions({ tabId, path: 'sidepanel.html', enabled: true })
    .catch(() => { /* tab may have closed */ })
}

async function disablePanelForTab(tabId: number) {
  await chrome.sidePanel
    .setOptions({ tabId, enabled: false })
    .catch(() => { /* tab may have closed */ })
}

chrome.runtime.onInstalled.addListener(async () => {
  if (!chrome.sidePanel) {
    console.warn('[AI Copilot] chrome.sidePanel API unavailable — Chrome 114+ required.')
    return
  }

  // Make Chrome auto-open the side panel when the action button is clicked.
  // This sidesteps the "open() requires a user gesture" rule entirely.
  await chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {})

  // Pre-enable for any Meet tabs that were already open before install/reload.
  const tabs = await chrome.tabs.query({ url: `${MEET_URL_PREFIX}*` })
  for (const tab of tabs) {
    if (tab.id != null) await enablePanelForMeetTab(tab.id)
  }
})

// Toggle the panel as users navigate between Meet and other tabs.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!chrome.sidePanel) return
  if (changeInfo.status !== 'loading' && !changeInfo.url) return

  const url = changeInfo.url ?? tab.url
  if (url?.startsWith(MEET_URL_PREFIX)) {
    enablePanelForMeetTab(tabId)
  } else {
    disablePanelForTab(tabId)
  }
})

// Relay messages from content script to side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message.type === 'MEET_STATE_CHANGE' ||
    message.type === 'MEET_CAPTION_PARTIAL' ||
    message.type === 'MEET_CAPTION_FINAL'
  ) {
    chrome.runtime.sendMessage(message).catch(() => { /* panel may not be open */ })
    sendResponse({ ok: true })
  }
  return false
})
