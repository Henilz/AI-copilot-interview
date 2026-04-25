import { useEffect, useRef } from 'react'
import { useStore } from '../../state/store'
import { interviews, evaluations, pollUntil } from '../services/api'
import {
  POLL_RESUME_INTERVAL_MS,
  POLL_RESUME_TIMEOUT_MS,
  POLL_EVAL_INTERVAL_MS,
  POLL_EVAL_TIMEOUT_MS,
} from '../../shared/constants'

export function useSessionTimer() {
  const phase     = useStore((s) => s.phase)
  const increment = useStore((s) => s.incrementElapsed)

  useEffect(() => {
    if (phase !== 'IN_PROGRESS' && phase !== 'BETWEEN_QUESTIONS') return
    const id = setInterval(increment, 1_000)
    return () => clearInterval(id)
  }, [phase, increment])
}

export function useInterview() {
  const {
    phase,
    interviewId,
    evaluationId,
    setPhase,
    setInterviewId,
    setEvaluationId,
    setQuestions,
    setResumeInfo,
    setEvaluationResult,
    setError,
    addToast,
    reset,
    markAsked,
    sendWs,
    askedQuestionIds,
    questions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
  } = useStore()

  const abortRef = useRef<AbortController | null>(null)

  function abort() {
    abortRef.current?.abort()
    abortRef.current = null
  }

  async function startUpload(file: File) {
    abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      setPhase('RESUME_PARSING')
      const { id } = await interviews.create()
      setInterviewId(id)

      await interviews.uploadResume(id, file)

      const status = await pollUntil(
        () => interviews.resumeStatus(id),
        (s) => s.state !== 'parsing',
        { intervalMs: POLL_RESUME_INTERVAL_MS, timeoutMs: POLL_RESUME_TIMEOUT_MS, signal: ac.signal }
      )

      if (status.state === 'failed') {
        setPhase('ERROR')
        setError(status.error ?? 'Resume parsing failed.')
        return
      }

      if (status.result) {
        setResumeInfo(status.result.name, status.result.summary, status.result.skills)
      }
      setPhase('RESUME_READY')

      const qs = await interviews.initialQuestions(id)
      setQuestions(qs)
      setPhase('QUESTIONS_READY')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setPhase('ERROR')
      setError((err as Error).message)
    }
  }

  async function startInterview() {
    setPhase('IN_PROGRESS')
    setCurrentQuestionIndex(0)
  }

  async function markQuestionAsked(questionId: string) {
    markAsked(questionId)
    if (interviewId) {
      await interviews.markAsked(interviewId, questionId).catch(() => {
        // optimistic — silently fail
      })
      sendWs({ type: 'question_asked', questionId })
    }
  }

  function nextQuestion() {
    const nextIndex = currentQuestionIndex + 1
    if (nextIndex < questions.length) {
      setPhase('BETWEEN_QUESTIONS')
      // Brief simulated loading state before advancing
      setTimeout(() => {
        setCurrentQuestionIndex(nextIndex)
        setPhase('IN_PROGRESS')
      }, 800)
    } else {
      endInterview()
    }
  }

  async function endInterview() {
    abort()
    if (!interviewId) return

    setPhase('ENDING')
    try {
      const { evaluationId: evalId } = await interviews.end(interviewId)
      setEvaluationId(evalId)

      const ac = new AbortController()
      abortRef.current = ac

      const evalStatus = await pollUntil(
        () => evaluations.status(evalId),
        (s) => s.state !== 'running',
        { intervalMs: POLL_EVAL_INTERVAL_MS, timeoutMs: POLL_EVAL_TIMEOUT_MS, signal: ac.signal }
      )

      if (evalStatus.state === 'failed') {
        setPhase('ERROR')
        setError('Evaluation failed. Please try again.')
        return
      }

      setEvaluationResult(
        evalStatus.pdfUrl ?? '',
        evalStatus.breakdown,
        evalStatus.averageScore
      )
      setPhase('REPORT_READY')
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setPhase('ERROR')
      setError((err as Error).message)
    }
  }

  function startOver() {
    abort()
    reset()
  }

  return {
    startUpload,
    startInterview,
    markQuestionAsked,
    nextQuestion,
    endInterview,
    startOver,
    phase,
    interviewId,
    evaluationId,
    questions,
    askedQuestionIds,
    currentQuestionIndex,
    addToast,
  }
}
