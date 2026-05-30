import { useEffect, useRef } from 'react'
import { InterviewSocket } from '../services/ws'
import { ensureJwt } from '../services/api'
import { useStore } from '../../state/store'
import type { InboundMessage } from '../../shared/types'

export function useWebSocket() {
  const socketRef = useRef<InterviewSocket | null>(null)

  const phase          = useStore((s) => s.phase)
  const interviewId    = useStore((s) => s.interviewId)
  const setWsStatus    = useStore((s) => s.setWsStatus)
  const setSendWs      = useStore((s) => s.setSendWs)
  const setLiveFeedback = useStore((s) => s.setLiveFeedback)
  const addToast       = useStore((s) => s.addToast)
  const questions      = useStore((s) => s.questions)

  function handleInbound(msg: InboundMessage) {
    switch (msg.type) {
      case 'score_update': {
        const q = questions.find((q) => q.id === msg.questionId)
        setLiveFeedback({
          score:      msg.score,
          strengths:  msg.strengths,
          questionId: msg.questionId,
        })
        if (msg.score >= 80) {
          addToast('ok', `Score: ${msg.score}/100 — Excellent!`)
        } else if (q && msg.score < 60) {
          addToast('info', `Score: ${msg.score}/100 — Try to be more specific.`)
        }
        break
      }
      case 'live_feedback':
        if (msg.score !== undefined) {
          // surface as a transient toast
          addToast('info', msg.text)
        }
        break
      case 'suggestion_error':
      case 'error':
        addToast('err', msg.message)
        break
      case 'pong':
      case 'connected':
      case 'transcript_ack':
      case 'suggestion_start':
      case 'suggestion_token':
      case 'suggestion_complete':
      case 'evaluation_ready':
        break
    }
  }

  useEffect(() => {
    if (phase !== 'IN_PROGRESS' || !interviewId) return

    let cancelled = false

    ensureJwt().then((jwt) => {
      if (cancelled) return

      const socket = new InterviewSocket({
        interviewId,
        jwt,
        onMessage: handleInbound,
        onStatus:  setWsStatus,
      })

      socket.open()
      socketRef.current = socket
      setSendWs((msg) => socket.send(msg))
    }).catch((err) => {
      addToast('err', (err as Error).message)
    })

    return () => {
      cancelled = true
      socketRef.current?.close()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, interviewId])
}
