type TagKind = 'pos' | 'warn' | 'neg'

const PREFIX: Record<TagKind, string> = {
  pos:  '✅',
  warn: '⚠️',
  neg:  '✗',
}

interface EvalTagsProps {
  score: number
}

function getTagsForScore(score: number): Array<[TagKind, string]> {
  if (score >= 80) return [['pos', 'Structured'], ['pos', 'Specific'], ['pos', 'On-topic']]
  if (score >= 60) return [['pos', 'Structured'], ['pos', 'Specific'], ['warn', 'Needs depth']]
  return [['warn', 'Vague'], ['neg', 'Off-topic']]
}

export function EvalTags({ score }: EvalTagsProps) {
  const tags = getTagsForScore(score)
  return (
    <div className="tag-row">
      {tags.map(([kind, label]) => (
        <span key={label} className={`eval-tag ${kind}`}>
          {PREFIX[kind]} {label}
        </span>
      ))}
    </div>
  )
}
