import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

interface SummaryViewProps {
  avgScore: number
  questionsSummary: string
  duration: string
  breakdown?: Array<{ label: string; pct: number }>
  pdfUrl?: string
  onNewInterview: () => void
}

const CONFETTI_COLORS = ['#1A73E8', '#34A853', '#FBBC04', '#EA4335', '#7C3AED']

function Confetti() {
  const dots = Array.from({ length: 14 }, (_, i) => ({
    left:  `${(i * 7 + 5) % 100}%`,
    delay: `${(i % 5) * 0.3}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }))
  return (
    <div className="confetti" aria-hidden>
      {dots.map((d, i) => (
        <i key={i} style={{ left: d.left, top: 0, background: d.color, animationDelay: d.delay }} />
      ))}
    </div>
  )
}

const DEFAULT_BREAKDOWN = [
  { label: 'Communication',   pct: 82 },
  { label: 'Technical',       pct: 71 },
  { label: 'Problem Solving', pct: 79 },
  { label: 'Cultural Fit',    pct: 85 },
]

export function SummaryView({
  avgScore,
  questionsSummary,
  duration,
  breakdown = DEFAULT_BREAKDOWN,
  pdfUrl,
  onNewInterview,
}: SummaryViewProps) {
  function handleDownload() {
    if (pdfUrl) window.open(pdfUrl, '_blank', 'noopener')
  }

  return (
    <>
      <div className="summary-hero">
        <Confetti />
        <div className="summary-check">
          <Icon name="check" size={36} fill />
        </div>
        <div className="summary-title">Interview Complete!</div>
        <div className="summary-sub">Nice work — here's how it went.</div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <div className="v">{avgScore}<small>/100</small></div>
          <div className="l">Average Score</div>
        </div>
        <div className="stat">
          <div className="v">{questionsSummary}</div>
          <div className="l">Questions</div>
        </div>
        <div className="stat">
          <div className="v">{duration}</div>
          <div className="l">Duration</div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <span className="section-title">Performance Breakdown</span>
        </div>
        <div className="perf">
          {breakdown.map(({ label, pct }) => (
            <div key={label} className="perf-row">
              <span className="perf-label">{label}</span>
              <div className="perf-track">
                <div className="perf-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="perf-pct">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button
          variant="primary"
          leadingIcon="download"
          onClick={handleDownload}
          disabled={!pdfUrl}
        >
          Download PDF Report
        </Button>
        <Button variant="secondary" leadingIcon="refresh" onClick={onNewInterview}>
          Start New Interview
        </Button>
      </div>
    </>
  )
}
