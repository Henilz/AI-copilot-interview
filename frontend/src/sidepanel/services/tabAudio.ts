import { ensureAudioApiReady, ensureJwt } from './api'

const WS_BASE = (import.meta.env.VITE_WS_BASE as string | undefined) || 'ws://localhost:8000'

interface StartTabAudioCaptureOpts {
  interviewId: string
  questionId?: string
  onTranscript: (text: string, questionId?: string) => void
  onError: (message: string) => void
  onStatus?: (status: 'OPEN' | 'CLOSED' | 'ERROR') => void
}

const CHUNK_MS = 4_000

let stream: MediaStream | undefined
let recorder: MediaRecorder | undefined
let socket: WebSocket | undefined
let currentQuestionId: string | undefined
let rotateTimer: ReturnType<typeof setInterval> | undefined
let activeMimeType = 'audio/webm'
let activeAudioStream: MediaStream | undefined
let stopping = false

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

  activeMimeType = mimeType
  activeAudioStream = audioOnlyStream
  stopping = false
  startRecorderCycle()

  rotateTimer = setInterval(() => {
    if (stopping) return
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
  }, CHUNK_MS)
}

function startRecorderCycle() {
  if (!activeAudioStream) return

  // Each MediaRecorder lifecycle produces ONE self-contained WebM blob with a
  // valid EBML header. Using start(timeslice) instead would give us headerless
  // mid-stream chunks that Groq Whisper rejects with 400 "invalid media file".
  const r = new MediaRecorder(activeAudioStream, { mimeType: activeMimeType })
  recorder = r

  const chunks: Blob[] = []
  r.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  r.onstop = async () => {
    if (chunks.length > 0 && socket?.readyState === WebSocket.OPEN) {
      const blob = new Blob(chunks, { type: activeMimeType })
      socket.send(await blob.arrayBuffer())
    }
    if (!stopping && activeAudioStream?.active) {
      startRecorderCycle()
    }
  }

  r.start()
}

export async function stopTabAudioCapture() {
  stopping = true

  if (rotateTimer) {
    clearInterval(rotateTimer)
    rotateTimer = undefined
  }

  if (recorder && recorder.state !== 'inactive') {
    recorder.stop()
  }
  recorder = undefined
  activeAudioStream = undefined

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
