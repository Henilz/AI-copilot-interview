export interface TranscriptionOpts {
  lang?: string
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onError: (err: Error) => void
}

export interface TranscriptionService {
  start(opts: TranscriptionOpts): Promise<void>
  stop(): void
  isSupported(): boolean
}

export class WebSpeechTranscription implements TranscriptionService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rec?: any
  private wantRunning = false

  isSupported() {
    return typeof (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition !== 'undefined'
  }

  async start(opts: TranscriptionOpts) {
    if (!this.isSupported()) {
      opts.onError(new Error('Speech recognition is not supported in this browser.'))
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = (window as any).webkitSpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = new Ctor()
    r.continuous = true
    r.interimResults = true
    r.lang = opts.lang ?? 'en-US'

    r.onresult = (e: { resultIndex: number; results: SpeechRecognitionResultList }) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          opts.onFinal(text)
        } else {
          opts.onPartial(text)
        }
      }
    }

    r.onerror = (e: { error: string }) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        this.wantRunning = false
        opts.onError(new Error('MIC_DENIED'))
      }
      // 'no-speech' and 'aborted' are benign — onend will restart
    }

    r.onend = () => {
      if (this.wantRunning) {
        try { this.rec?.start() } catch { /* already starting */ }
      }
    }

    this.rec = r
    this.wantRunning = true
    r.start()
  }

  stop() {
    this.wantRunning = false
    try { this.rec?.stop() } catch { /* already stopped */ }
  }
}
