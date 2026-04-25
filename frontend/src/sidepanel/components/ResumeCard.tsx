import { Icon } from './ui/Icon'

interface ResumeCardProps {
  name: string
  summary: string
  skills: string[]
  skillCount?: number
}

export function ResumeCard({ name, summary, skills, skillCount }: ResumeCardProps) {
  const displayed = skills.slice(0, 6)

  return (
    <div className="resume-card">
      <div className="resume-row">
        <div className="resume-icon">
          <Icon name="description" size={20} />
        </div>
        <div>
          <div className="resume-name">{name}</div>
          <div className="resume-sub">
            Resume parsed · {skillCount ?? skills.length} skills detected
          </div>
        </div>
      </div>

      {summary && <p className="resume-summary">{summary}</p>}

      {displayed.length > 0 && (
        <div className="skill-row">
          {displayed.map((s) => (
            <span key={s} className="skill">{s}</span>
          ))}
        </div>
      )}
    </div>
  )
}
