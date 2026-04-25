// Service worker: wire the action button to open the side panel on Meet tabs.
// All WebSocket and speech recognition logic lives in the side panel itself.

chrome.runtime.onInstalled.addListener(() => {
  // Warn if Side Panel API is unavailable (Chrome < 114)
  if (!chrome.sidePanel) {
    console.warn('[AI Copilot] chrome.sidePanel API unavailable — Chrome 114+ required.')
  }
})

// Open side panel when the action icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (!chrome.sidePanel) return
  try {
    await chrome.sidePanel.open({ tabId: tab.id! })
  } catch (err) {
    console.error('[AI Copilot] Failed to open side panel:', err)
  }
})

// Enable the side panel only on Meet pages, disable on other tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!chrome.sidePanel) return
  if (changeInfo.status !== 'loading') return

  const isMeet = tab.url?.startsWith('https://meet.google.com/')
  chrome.sidePanel
    .setOptions({
      tabId,
      enabled: isMeet ?? false,
    })
    .catch(() => { /* tab may have already closed */ })
})

// Relay messages from content script to side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'MEET_STATE_CHANGE') {
    // Broadcast to all extension pages (the side panel listens via chrome.runtime.onMessage)
    chrome.runtime.sendMessage(message).catch(() => { /* panel may not be open */ })
    sendResponse({ ok: true })
  }
  return false
})
