import { ensureAudioApiReady, ensureJwt } from './api'

const WS_BASE = (import.meta.env.VITE_WS_BASE as string | undefined) || 'ws://localhost:8000'

interface StartTabAudioCaptureOpts {
  interviewId: string
  questionId?: string
  onTranscript: (text: string, questionId?: string) => void
  onError: (message: string) => void
  onStatus?: (status: 'OPEN' | 'CLOSED' | 'ERROR') => void
}

let stream: MediaStream | undefined
let recorder: MediaRecorder | undefined
let socket: WebSocket | undefined
let currentQuestionId: string | undefined

export async function startTabAudioCapture(opts: StartTabAudioCaptureOpts) {
  await stopTabAudioCapture()

  currentQuestionId = opts.questionId
  const token = await ensureJwt()
  await ensureAudioApiReady()

  stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  })

  const audioTracks = stream.getAudioTracks()
  if (audioTracks.length === 0) {
    stream.getTracks().forEach((track) => track.stop())
    stream = undefined
    throw new Error('No tab audio was shared. Select the Google Meet tab and enable tab audio sharing.')
  }

  // We only need audio. Stop video immediately after Chrome grants the stream.
  stream.getVideoTracks().forEach((track) => track.stop())
  stream.getAudioTracks().forEach((track) => {
    track.onended = () => {
      opts.onStatus?.('CLOSED')
      stopTabAudioCapture()
    }
  })

  const audioOnlyStream = new MediaStream(audioTracks)
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm'

  socket = new WebSocket(
    `${WS_BASE.replace(/\/$/, '')}/ws/interviews/${opts.interviewId}/audio?token=${encodeURIComponent(token)}`
  )
  socket.binaryType = 'arraybuffer'

  socket.onopen = () => {
    socket?.send(`content_type:${mimeType}`)
    if (currentQuestionId) socket?.send(`question_id:${currentQuestionId}`)
    opts.onStatus?.('OPEN')
  }

  socket.onmessage = (event) => {
    if (typeof event.data !== 'string') return

    try {
      const msg = JSON.parse(event.data) as {
        type?: string
        text?: string
        message?: string
        question_id?: string
      }

      if (msg.type === 'audio_transcript' && msg.text) {
        opts.onTranscript(msg.text, msg.question_id ?? currentQuestionId)
      } else if (msg.type === 'audio_error') {
        opts.onError(msg.message ?? 'Audio transcription failed.')
      }
    } catch {
      // Ignore non-JSON control frames.
    }
  }

  socket.onerror = () => {
    opts.onStatus?.('ERROR')
    opts.onError('Audio transcription socket failed.')
  }
  socket.onclose = () => opts.onStatus?.('CLOSED')

  recorder = new MediaRecorder(audioOnlyStream, { mimeType })
  recorder.ondataavailable = async (event) => {
    if (event.data.size === 0 || socket?.readyState !== WebSocket.OPEN) return
    socket.send(await event.data.arrayBuffer())
  }
  recorder.start(3_000)
}

export async function stopTabAudioCapture() {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop()
  }
  recorder = undefined

  stream?.getTracks().forEach((track) => track.stop())
  stream = undefined

  socket?.close()
  socket = undefined
}

export async function updateTabAudioQuestion(questionId?: string) {
  currentQuestionId = questionId
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(`question_id:${questionId ?? ''}`)
  }
}
