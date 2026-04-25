import { useState, useEffect } from 'react'
import { useStore } from '../../state/store'
import { useInterview, useSessionTimer } from '../hooks/useInterview'
import { useWebSocket } from '../hooks/useWebSocket'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { Header } from '../components/Header'
import { DifficultyBar } from '../components/DifficultyBar'
import { QuestionCard } from '../components/QuestionCard'
import { AudioToggle } from '../components/AudioToggle'
import { LiveTranscript } from '../components/LiveTranscript'
import { ScoreMeter } from '../components/ScoreMeter'
import { Button } from '../components/ui/Button'
import { ToastStack } from '../components/ui/Toast'

function SkeletonCard() {
  return (
    <div className="sk-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="skeleton" style={{ width: 80, height: 12 }} />
        <div className="skeleton" style={{ width: 60, height: 18, borderRadius: 9 }} />
      </div>
      <div className="skeleton sk-line" style={{ width: '92%' }} />
      <div className="skeleton sk-line" style={{ width: '78%' }} />
      <div className="skeleton sk-line" style={{ width: '40%' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, color: 'var(--on-surface-variant)', font: '13px var(--font-sans)' }}>
        <span className="dots"><span /><span /><span /></span>
        <span>Generating next question…</span>
      </div>
    </div>
  )
}

export function InterviewSession() {
  const [listening, setListening] = useState(false)
  const { start: startMic, stop: stopMic } = useSpeechRecognition()

  // Wire WebSocket and session timer
  useWebSocket()
  useSessionTimer()

  const {
    questions,
    currentQuestionIndex,
    askedQuestionIds,
    markQuestionAsked,
    nextQuestion,
    endInterview,
  } = useInterview()

  const phase       = useStore((s) => s.phase)
  const elapsed     = useStore((s) => s.sessionElapsed)
  const transcript  = useStore((s) => s.transcript)
  const partial     = useStore((s) => s.partialTranscript)
  const liveFeedback = useStore((s) => s.liveFeedback)

  const currentQuestion = questions[currentQuestionIndex]
  const isBetween = phase === 'BETWEEN_QUESTIONS'
  const isEnding  = phase === 'ENDING'

  // Build full final transcript as a single string
  const fullText = transcript
    .filter((e) => e.isFinal)
    .map((e) => e.text)
    .join(' ')

  const headerStatus = listening ? 'recording' : 'active'
  const askedCount   = askedQuestionIds.length

  async function toggleListening() {
    if (listening) {
      stopMic()
      setListening(false)
    } else {
      await startMic()
      setListening(true)
    }
  }

  // Stop mic when leaving IN_PROGRESS
  useEffect(() => {
    if (phase !== 'IN_PROGRESS') {
      stopMic()
      setListening(false)
    }
  }, [phase, stopMic])

  return (
    <div className="panel">
      <Header
        status={headerStatus}
        elapsed={elapsed}
        showTimer
        showWave={listening}
      />
      <ToastStack />

      <div className="panel-body">
        {/* Progress pill */}
        <div style={{ height: 12 }} />
        <div className="progress-pill">
          <span>{askedCount} / {questions.length} asked</span>
          <div className="progress-track">
            <div className="fill" style={{ width: `${(askedCount / Math.max(questions.length, 1)) * 100}%` }} />
          </div>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.round((askedCount / Math.max(questions.length, 1)) * 100)}%
          </span>
        </div>

        <div style={{ height: 12 }} />

        {/* Difficulty bar */}
        {currentQuestion && (
          <DifficultyBar level={currentQuestion.difficulty} />
        )}

        <div style={{ height: 10 }} />

        {/* Question card or skeleton */}
        {isBetween || isEnding ? (
          <SkeletonCard />
        ) : currentQuestion ? (
          <QuestionCard
            question={currentQuestion}
            index={currentQuestionIndex + 1}
            total={questions.length}
            onRegen={undefined}
            onCopy={undefined}
          />
        ) : null}

        <div style={{ height: 10 }} />

        {/* Mark as asked chip */}
        {currentQuestion && !isBetween && (
          <div style={{ padding: '0 16px' }}>
            <button
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--r-input)',
                border: '1px solid var(--outline-variant)',
                background: askedQuestionIds.includes(currentQuestion.id)
                  ? 'var(--success-light)'
                  : 'var(--surface-variant)',
                font: '500 13px var(--font-sans)',
                color: askedQuestionIds.includes(currentQuestion.id) ? '#137333' : 'var(--on-surface)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onClick={() => markQuestionAsked(currentQuestion.id)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {askedQuestionIds.includes(currentQuestion.id) ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              {askedQuestionIds.includes(currentQuestion.id) ? 'Question Asked ✓' : 'Mark as Asked'}
            </button>
          </div>
        )}

        <div style={{ height: 10 }} />

        {/* Audio toggle */}
        {!isBetween && !isEnding && (
          <AudioToggle listening={listening} onToggle={toggleListening} />
        )}

        {/* Transcript */}
        <div className="section">
          <LiveTranscript text={fullText} partial={partial} listening={listening} />
        </div>

        {/* Live feedback */}
        {liveFeedback && (
          <div className="section">
            <div className="section-head" style={{ marginBottom: 8 }}>
              <span className="section-title">Answer Evaluation</span>
            </div>
            <ScoreMeter score={liveFeedback.score} />
          </div>
        )}

        {/* Actions */}
        <div className="section" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Button
            variant="primary"
            trailingIcon="arrow_forward"
            onClick={nextQuestion}
            disabled={isBetween || isEnding}
          >
            {currentQuestionIndex + 1 >= questions.length ? 'Finish Interview' : 'Next Question'}
          </Button>
          <button className="link-end" onClick={endInterview}>End Interview</button>
        </div>
      </div>
    </div>
  )
}
