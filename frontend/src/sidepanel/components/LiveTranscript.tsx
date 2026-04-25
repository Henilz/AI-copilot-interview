import { useEffect, useRef } from 'react'
import { Icon } from './ui/Icon'

interface LiveTranscriptProps {
  text: string
  partial: string
  listening: boolean
}

export function LiveTranscript({ text, partial, listening }: LiveTranscriptProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isEmpty = !text && !partial

  // Auto-scroll to bottom as new text arrives
  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text, partial])

  return (
    <div>
      <div className="section-head" style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon
            name={listening ? 'graphic_eq' : 'mic_off'}
            size={16}
            style={{ color: listening ? 'var(--success)' : 'var(--on-surface-subtle)' }}
          />
          <span className="section-title">Live Transcript</span>
        </div>
      </div>

      <div className="transcript" ref={containerRef} aria-live="polite" aria-atomic="false">
        {isEmpty ? (
          <span className="placeholder">Transcript will appear here when listening…</span>
        ) : (
          <>
            {text && <span>{text}</span>}
            {partial && (
              <span style={{ color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                {text ? ' ' : ''}{partial}
              </span>
            )}
            {listening && <span className="cursor-blink" aria-hidden />}
          </>
        )}
      </div>
    </div>
  )
}
