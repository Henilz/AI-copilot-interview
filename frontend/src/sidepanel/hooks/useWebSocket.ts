import { useEffect, useRef } from 'react'
import { InterviewSocket } from '../services/ws'
import { useStore } from '../../state/store'
import type { InboundMessage } from '../../shared/types'

const JWT = import.meta.env.VITE_DEV_JWT as string

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
      case 'pong':
        break
    }
  }

  useEffect(() => {
    if (phase !== 'IN_PROGRESS' || !interviewId) return

    const socket = new InterviewSocket({
      interviewId,
      jwt: JWT,
      onMessage: handleInbound,
      onStatus:  setWsStatus,
    })

    socket.open()
    socketRef.current = socket
    setSendWs((msg) => socket.send(msg))

    return () => {
      socket.close()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, interviewId])
}
