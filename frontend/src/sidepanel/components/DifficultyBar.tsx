import { DIFFICULTY_LEVELS } from '../../shared/constants'

interface DifficultyBarProps {
  level: 1 | 2 | 3 | 4 | 5
}

export function DifficultyBar({ level }: DifficultyBarProps) {
  const lvl = DIFFICULTY_LEVELS[level - 1]

  return (
    <div className="diff" style={{ '--c': lvl.color } as React.CSSProperties}>
      <div className="diff-head">
        <span className="diff-title">Dynamic Difficulty</span>
        <span className="diff-level" style={{ color: lvl.color }}>{lvl.name}</span>
      </div>
      <div className="diff-pips">
        {DIFFICULTY_LEVELS.map((l, i) => {
          const on  = i + 1 <= level
          const cur = i + 1 === level
          return (
            <div
              key={l.id}
              className={`diff-pip${on ? ' on' : ''}${cur ? ' cur' : ''}`}
              style={on ? { background: lvl.color } : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
