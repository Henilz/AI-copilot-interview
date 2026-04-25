import { IconButton } from './ui/Button'
import { DIFFICULTY_LEVELS } from '../../shared/constants'
import type { Question } from '../../shared/types'

interface QuestionCardProps {
  question: Question
  index: number
  total: number
  onRegen?: () => void
  onCopy?: () => void
}

export function QuestionCard({ question, index, total, onRegen, onCopy }: QuestionCardProps) {
  const lvl = DIFFICULTY_LEVELS[question.difficulty - 1]

  function handleCopy() {
    navigator.clipboard.writeText(question.text).catch(() => {})
    onCopy?.()
  }

  return (
    <div className="q-card">
      <div className="q-accent" style={{ background: lvl.color }} />

      <div className="q-top">
        <span className="q-counter">Question {index} of {total}</span>
        <span
          className="q-badge"
          style={{ background: lvl.badgeBg, color: lvl.badgeFg }}
        >
          {lvl.name}
        </span>
      </div>

      <p className="q-text">{question.text}</p>

      <div className="q-actions">
        <IconButton icon="refresh"       label="Regenerate question" onClick={onRegen} />
        <IconButton icon="content_copy"  label="Copy question"       onClick={handleCopy} />
      </div>
    </div>
  )
}
