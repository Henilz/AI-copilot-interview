import { useStore } from '../../state/store'
import { useInterview } from '../hooks/useInterview'
import { Header, fmtTime } from '../components/Header'
import { SummaryView } from '../components/SummaryView'
import { Spinner } from '../components/ui/Spinner'

export function EvaluationReport() {
  const phase             = useStore((s) => s.phase)
  const pdfUrl            = useStore((s) => s.evaluationPdfUrl)
  const breakdown         = useStore((s) => s.evaluationBreakdown)
  const averageScore      = useStore((s) => s.averageScore)
  const elapsed           = useStore((s) => s.sessionElapsed)
  const questions         = useStore((s) => s.questions)
  const askedQuestionIds  = useStore((s) => s.askedQuestionIds)
  const { startOver }     = useInterview()

  const isEnding   = phase === 'ENDING'
  const isReady    = phase === 'REPORT_READY'

  const questionsSummary = `${askedQuestionIds.length}/${questions.length}`
  const durationStr      = fmtTime(elapsed)

  if (isEnding) {
    return (
      <div className="panel">
        <Header status="active" elapsed={elapsed} showTimer />
        <div className="panel-body" style={{ alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
          <Spinner size={32} />
          <p style={{ font: 'var(--t-body)', color: 'var(--on-surface-variant)', textAlign: 'center', margin: 0 }}>
            Generating your evaluation…
          </p>
        </div>
      </div>
    )
  }

  if (!isReady) return null

  return (
    <div className="panel">
      <Header status="complete" />
      <div className="panel-body">
        <SummaryView
          avgScore={averageScore ?? 0}
          questionsSummary={questionsSummary}
          duration={durationStr}
          breakdown={breakdown}
          pdfUrl={pdfUrl}
          onNewInterview={startOver}
        />
      </div>
    </div>
  )
}
