import { useEffect, useRef } from 'react'

interface PollingOpts<T> {
  fn: () => Promise<T>
  done: (value: T) => boolean
  onResult: (value: T) => void
  onError: (err: unknown) => void
  intervalMs?: number
  timeoutMs?: number
  enabled: boolean
}

export function usePolling<T>({
  fn,
  done,
  onResult,
  onError,
  intervalMs = 1_500,
  timeoutMs = 90_000,
  enabled,
}: PollingOpts<T>) {
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    abortRef.current = controller
    const deadline = Date.now() + timeoutMs

    let cancelled = false

    ;(async () => {
      while (!cancelled && !controller.signal.aborted) {
        try {
          const result = await fn()
          if (cancelled || controller.signal.aborted) return
          onResult(result)
          if (done(result)) return
        } catch (err) {
          if (cancelled || controller.signal.aborted) return
          onError(err)
          return
        }

        if (Date.now() + intervalMs > deadline) {
          onError(new Error('Polling timed out'))
          return
        }

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, intervalMs)
          controller.signal.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }).catch(() => { cancelled = true })
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
