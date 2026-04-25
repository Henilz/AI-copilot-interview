import { EvalTags } from './EvalTags'

interface ScoreMeterProps {
  score: number
  size?: number
}

export function ScoreMeter({ score, size = 72 }: ScoreMeterProps) {
  const r      = size / 2 - 4
  const circ   = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)

  const color =
    score >= 80 ? 'var(--success)' :
    score >= 60 ? 'var(--warning)' :
    'var(--error)'

  const label =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    'Needs Work'

  const labelColor =
    score >= 80 ? 'var(--success)' :
    score >= 60 ? '#9A6700' :
    'var(--error)'

  return (
    <div className="score-row">
      <div className="score-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" strokeWidth="4"
            stroke="var(--outline-variant)"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" strokeWidth="4" strokeLinecap="round"
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 600ms var(--ease-out)' }}
          />
        </svg>
        <div className="score-num">
          <span className="n">
            {score}<small>/100</small>
          </span>
        </div>
      </div>

      <div className="score-meta">
        <div className="score-label" style={{ color: labelColor }}>{label}</div>
        <EvalTags score={score} />
      </div>
    </div>
  )
}
