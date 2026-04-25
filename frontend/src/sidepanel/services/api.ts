import type { Question, ResumeStatus, EvalStatus, Interview } from '../../shared/types'
import type { PollOpts } from '../../shared/types'

const BASE = import.meta.env.VITE_API_BASE as string
const JWT  = import.meta.env.VITE_DEV_JWT  as string

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

let _jwt = JWT

export function setJwt(token: string) {
  _jwt = token
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${_jwt}`,
      ...((init.body instanceof FormData) ? {} : { 'Content-Type': 'application/json' }),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }

  return res.status === 204 ? (undefined as T) : res.json()
}

export const interviews = {
  create: () =>
    req<{ id: string }>('/api/interviews', { method: 'POST' }),

  get: (id: string) =>
    req<Interview>(`/api/interviews/${id}`),

  uploadResume: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return req<{ accepted: true }>(`/api/interviews/${id}/resume`, {
      method: 'POST',
      body: fd,
      headers: {},
    })
  },

  resumeStatus: (id: string) =>
    req<ResumeStatus>(`/api/interviews/${id}/resume/status`),

  initialQuestions: (id: string) =>
    req<Question[]>(`/api/interviews/${id}/initial-questions`),

  markAsked: (id: string, qid: string) =>
    req<void>(`/api/interviews/${id}/questions/${qid}/asked`, { method: 'PATCH' }),

  end: (id: string) =>
    req<{ evaluationId: string }>(`/api/interviews/${id}/end`, { method: 'POST' }),
}

export const evaluations = {
  status: (id: string) =>
    req<EvalStatus>(`/api/evaluations/${id}/status`),
}

export async function pollUntil<T>(
  fn: () => Promise<T>,
  done: (v: T) => boolean,
  { intervalMs = 1_500, timeoutMs = 90_000, signal }: PollOpts = {}
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const result = await fn()
    if (done(result)) return result
    if (Date.now() + intervalMs > deadline) throw new Error('Poll timeout')
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs)
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) })
    })
  }
}
