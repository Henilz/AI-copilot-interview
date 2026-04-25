import { useStore } from '../../state/store'
import { useInterview } from '../hooks/useInterview'
import { Header } from '../components/Header'
import { UploadZone, type UploadState } from '../components/UploadZone'
import { ResumeCard } from '../components/ResumeCard'
import { Button } from '../components/ui/Button'

export function ResumeUpload() {
  const { startUpload, startInterview } = useInterview()
  const phase         = useStore((s) => s.phase)
  const questionCount = useStore((s) => s.questions.length)
  const resumeName    = useStore((s) => s.resumeName)
  const resumeSummary = useStore((s) => s.resumeSummary)
  const resumeSkills  = useStore((s) => s.resumeSkills)
  const error         = useStore((s) => s.error)

  const isParsing        = phase === 'RESUME_PARSING'
  const isReady          = phase === 'RESUME_READY'
  const isQuestionsReady = phase === 'QUESTIONS_READY'
  const isError          = phase === 'ERROR'

  const uploadState: UploadState = isParsing ? 'uploading' : 'idle'

  // The extension is only enabled on meet.google.com (manifest enforces it),
  // so if the panel is open the user is already on Meet. Always show active.
  const headerStatus: 'active' | 'idle' = isQuestionsReady ? 'idle' : 'active'

  return (
    <div className="panel">
      <Header status={headerStatus} subtitle="Meet session active" />

      <div className="panel-body">
        <div style={{ height: 8 }} />

        {/* Upload zone — visible until resume is parsed */}
        {!isReady && !isQuestionsReady && !isError && (
          <UploadZone state={uploadState} onFile={startUpload} />
        )}

        {/* Resume card — visible once parsed */}
        {(isReady || isQuestionsReady) && resumeName && (
          <ResumeCard
            name={resumeName}
            summary={resumeSummary ?? ''}
            skills={resumeSkills}
          />
        )}

        {/* Error state */}
        {isError && (
          <div className="section">
            <div style={{
              padding: '12px',
              background: 'var(--error-light)',
              borderRadius: 'var(--r-card)',
              font: 'var(--t-body)',
              color: '#A50E0E',
            }}>
              {error ?? 'Something went wrong. Please try again.'}
            </div>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Start interview CTA */}
        <div className="section" style={{ marginTop: 'auto' }}>
          <Button
            variant="primary"
            trailingIcon="arrow_forward"
            onClick={startInterview}
            disabled={!isQuestionsReady}
          >
            {isQuestionsReady
              ? `Start Interview (${questionCount} questions)`
              : 'Start Interview'}
          </Button>
        </div>
      </div>
    </div>
  )
}
