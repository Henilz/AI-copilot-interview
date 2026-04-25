import { useStore } from '../../state/store'
import { useInterview } from '../hooks/useInterview'
import { Header } from '../components/Header'
import { UploadZone, type UploadState } from '../components/UploadZone'
import { ResumeCard } from '../components/ResumeCard'
import { Button } from '../components/ui/Button'

// Google Meet icon inline SVG — keeps the footer self-contained
function MeetIcon() {
  return (
    <svg className="gmeet-icon" viewBox="0 0 87 72" xmlns="http://www.w3.org/2000/svg" aria-hidden
      style={{ width: 20, height: 20, flexShrink: 0 }}>
      <path d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z" fill="#00832d"/>
      <path d="M0 51.5V66c0 3.32 2.68 6 6 6h14.5l3-10.96-3-9.54-9.95-3z" fill="#0066da"/>
      <path d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z" fill="#e94235"/>
      <path d="M0 51.5h20.5v-31H0z" fill="#2684fc"/>
      <path d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.14 4.85-2.37V11.02c0-2.54-2.94-3.93-4.91-2.34zM49.5 36v15.5H20.5V72h43c3.32 0 6-2.68 6-6V53.08z" fill="#00ac47"/>
      <path d="M63.5 0H20.5v20.5h29V36l20-.01V6c0-3.32-2.68-6-6-6z" fill="#ffba00"/>
    </svg>
  )
}

export function ResumeUpload() {
  const { startUpload, startInterview } = useInterview()
  const phase         = useStore((s) => s.phase)
  const questionCount = useStore((s) => s.questions.length)
  const resumeName    = useStore((s) => s.resumeName)
  const resumeSummary = useStore((s) => s.resumeSummary)
  const resumeSkills  = useStore((s) => s.resumeSkills)
  const error       = useStore((s) => s.error)

  const isParsing    = phase === 'RESUME_PARSING'
  const isReady      = phase === 'RESUME_READY'
  const isQuestionsReady = phase === 'QUESTIONS_READY'
  const isError      = phase === 'ERROR'

  const uploadState: UploadState = isParsing ? 'uploading' : 'idle'

  const headerStatus = isReady || isQuestionsReady ? 'active' : 'idle'
  const headerSubtitle = isReady || isQuestionsReady
    ? 'Meet session active'
    : 'Waiting for Google Meet…'

  return (
    <div className="panel">
      <Header status={headerStatus} subtitle={headerSubtitle} />

      <div className="panel-body">
        <div style={{ height: 8 }} />

        {/* Show upload zone until resume is parsed */}
        {!isReady && !isQuestionsReady && (
          <UploadZone state={uploadState} onFile={startUpload} />
        )}

        {/* Resume card after parsing */}
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

        {/* Footer hint */}
        <div className="footer-hint">
          <MeetIcon />
          <span>Open on a Google Meet call to enable audio capture.</span>
        </div>
      </div>
    </div>
  )
}
