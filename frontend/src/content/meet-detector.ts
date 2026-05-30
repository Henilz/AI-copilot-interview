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
let lastPartial = ''
let lastFinal = ''
let finalTimer: ReturnType<typeof setTimeout> | undefined

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

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el)
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none'
  )
}

function cleanCaptionText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^(captions?|subtitles?)\s+/i, '')
    .trim()
}

function isLikelyCaption(text: string): boolean {
  if (text.length < 12 || text.length > 500) return false

  const lower = text.toLowerCase()
  const blocked = [
    'ai interview co-pilot',
    'listen to answer',
    'live transcript',
    'start interview',
    'end interview',
    'microphone',
    'session active',
    'participants',
    'chat with everyone',
    'turn on captions',
    'turn off captions',
  ]

  return !blocked.some((term) => lower.includes(term))
}

function findCaptionText(): string {
  const liveRegions = Array.from(
    document.querySelectorAll('[aria-live], [role="status"], [role="log"]')
  )

  const liveText = liveRegions
    .filter(isVisible)
    .map((el) => cleanCaptionText(el.textContent ?? ''))
    .filter(isLikelyCaption)
    .sort((a, b) => b.length - a.length)[0]

  if (liveText) return liveText

  const lowerHalf = Array.from(document.querySelectorAll('div, span'))
    .filter((el) => {
      const rect = el.getBoundingClientRect()
      return isVisible(el) && rect.top > window.innerHeight * 0.45
    })
    .map((el) => cleanCaptionText(el.textContent ?? ''))
    .filter(isLikelyCaption)
    .sort((a, b) => b.length - a.length)

  return lowerHalf[0] ?? ''
}

function emitCaption() {
  const text = findCaptionText()
  if (!text || text === lastPartial) return

  lastPartial = text
  chrome.runtime.sendMessage({ type: 'MEET_CAPTION_PARTIAL', text }).catch(() => {})

  clearTimeout(finalTimer)
  finalTimer = setTimeout(() => {
    if (lastPartial && lastPartial !== lastFinal) {
      lastFinal = lastPartial
      chrome.runtime.sendMessage({ type: 'MEET_CAPTION_FINAL', text: lastFinal }).catch(() => {})
    }
  }, 1_200)
}

const captionObserver = new MutationObserver(emitCaption)
captionObserver.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
})

setInterval(emitCaption, 1_000)
