// Content script injected on meet.google.com.
// Detects whether the user is currently in an active call and notifies the background.

function isMeetCallActive(): boolean {
  // Meet adds [data-call-ended="false"] or a <div data-meeting-title> when in a call.
  // The simplest reliable signal is the presence of a video grid container.
  return (
    document.querySelector('[data-allocation-index]') !== null ||
    document.querySelector('[data-self-name]') !== null ||
    document.querySelector('.crqnQb') !== null // Meet's participant grid class
  )
}

let lastState: boolean | null = null

function check() {
  const active = isMeetCallActive()
  if (active === lastState) return
  lastState = active
  chrome.runtime.sendMessage({ type: 'MEET_STATE_CHANGE', active }).catch(() => {
    // background may not be ready yet — ignore
  })
}

// Check on load and then observe DOM mutations for SPA navigation
check()

const observer = new MutationObserver(check)
observer.observe(document.body, { childList: true, subtree: true })

// Also poll every 5s as a fallback (Meet is a SPA and mutations can be noisy)
setInterval(check, 5_000)
