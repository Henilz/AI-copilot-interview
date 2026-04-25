import { useStore } from '../state/store'
import { ResumeUpload } from './routes/ResumeUpload'
import { InterviewSession } from './routes/InterviewSession'
import { EvaluationReport } from './routes/EvaluationReport'
import { Header } from './components/Header'
import { Button } from './components/ui/Button'

function ErrorScreen() {
  const error     = useStore((s) => s.error)
  const reset     = useStore((s) => s.reset)

  return (
    <div className="panel">
      <Header status="idle" />
      <div className="error-panel">
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--error)' }}>
          error_outline
        </span>
        <p>{error ?? 'An unexpected error occurred.'}</p>
        <Button variant="secondary" onClick={reset}>Start Over</Button>
      </div>
    </div>
  )
}

export function App() {
  const phase = useStore((s) => s.phase)

  switch (phase) {
    case 'READY_TO_UPLOAD':
    case 'RESUME_PARSING':
    case 'RESUME_READY':
    case 'QUESTIONS_READY':
      return <ResumeUpload />

    case 'IN_PROGRESS':
    case 'BETWEEN_QUESTIONS':
      return <InterviewSession />

    case 'ENDING':
    case 'REPORT_READY':
      return <EvaluationReport />

    case 'ERROR':
      return <ErrorScreen />

    default:
      return <ResumeUpload />
  }
}
