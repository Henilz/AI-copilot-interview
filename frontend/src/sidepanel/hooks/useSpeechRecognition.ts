import { useCallback, useRef } from 'react'
import { WebSpeechTranscription } from '../services/transcription'
import { useStore } from '../../state/store'
import { TRANSCRIPT_THROTTLE_MS } from '../../shared/constants'

export function useSpeechRecognition() {
  const svcRef      = useRef<WebSpeechTranscription | null>(null)
  const partialTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingPartial = useRef('')

  const setPartial     = useStore((s) => s.setPartialTranscript)
  const addFinal       = useStore((s) => s.addFinalTranscript)
  const sendWs         = useStore((s) => s.sendWs)
  const currentQIndex  = useStore((s) => s.currentQuestionIndex)
  const questions      = useStore((s) => s.questions)
  const addToast       = useStore((s) => s.addToast)

  const currentQuestionId = questions[currentQIndex]?.id

  function flushPartial() {
    const text = pendingPartial.current
    if (!text) return
    setPartial(text)
    sendWs({ type: 'transcript_chunk', text, isFinal: false, t: Date.now(), questionId: currentQuestionId })
  }

  const start = useCallback(async () => {
    const svc = new WebSpeechTranscription()
    if (!svc.isSupported()) {
      addToast('err', 'Speech recognition is not available. Please use Chrome.')
      return
    }
    svcRef.current = svc

    await svc.start({
      lang: 'en-US',

      onPartial: (text) => {
        pendingPartial.current = text
        setPartial(text)
        // Throttle WS sends for partials
        if (!partialTimer.current) {
          partialTimer.current = setTimeout(() => {
            partialTimer.current = null
            flushPartial()
          }, TRANSCRIPT_THROTTLE_MS)
        }
      },

      onFinal: (text) => {
        clearTimeout(partialTimer.current ?? undefined)
        partialTimer.current = null
        pendingPartial.current = ''

        const entry = {
          id: crypto.randomUUID(),
          text,
          isFinal: true,
          timestamp: Date.now(),
          questionId: currentQuestionId,
        }
        addFinal(entry)
        sendWs({ type: 'transcript_chunk', text, isFinal: true, t: Date.now(), questionId: currentQuestionId })
      },

      onError: (err) => {
        if (err.message === 'MIC_DENIED') {
          addToast('err', 'Microphone access denied. Please allow mic in Chrome settings.')
        }
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId])

  const stop = useCallback(() => {
    clearTimeout(partialTimer.current ?? undefined)
    partialTimer.current = null
    svcRef.current?.stop()
    svcRef.current = null
    setPartial('')
  }, [setPartial])

  const isSupported = useCallback(() => {
    return new WebSpeechTranscription().isSupported()
  }, [])

  return { start, stop, isSupported }
}
