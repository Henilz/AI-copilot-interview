import { Icon } from './ui/Icon'

type HeaderStatus = 'idle' | 'active' | 'recording' | 'complete'

interface HeaderProps {
  status?: HeaderStatus
  subtitle?: string
  elapsed?: number
  showTimer?: boolean
  showWave?: boolean
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export { fmtTime }

const STATUS_TEXT: Record<HeaderStatus, string> = {
  idle:      'Waiting for Meet…',
  active:    'Session Active',
  recording: 'Recording',
  complete:  'Complete',
}

export function Header({
  status = 'idle',
  subtitle,
  elapsed = 0,
  showTimer = false,
  showWave = false,
}: HeaderProps) {
  const dotClass =
    status === 'recording' ? 'recording' : status === 'active' ? 'active' : ''
  const textClass = status === 'active' || status === 'recording' ? 'active' : ''

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">
          <Icon name="smart_toy" size={18} />
        </div>
        <div className="brand-text">
          <div className="brand-title">AI Interview Co-Pilot</div>
          {subtitle && <div className="brand-sub">{subtitle}</div>}
        </div>
      </div>

      <div className="header-meta">
        {showWave && (
          <span className="wave wave-header" aria-hidden>
            <span /><span /><span /><span />
          </span>
        )}
        <span className="status">
          <span className={`status-dot ${dotClass}`} />
          <span className={`status-text ${textClass}`}>{STATUS_TEXT[status]}</span>
        </span>
        {showTimer && (
          <span className="timer">{fmtTime(elapsed)}</span>
        )}
      </div>
    </header>
  )
}
