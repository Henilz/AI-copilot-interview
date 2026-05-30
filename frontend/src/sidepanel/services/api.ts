import type { Question, ResumeStatus, EvalStatus, Interview } from '../../shared/types'
import type { PollOpts } from '../../shared/types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:8000'
const JWT  = import.meta.env.VITE_DEV_JWT as string | undefined
const AUTH_USERNAME = (import.meta.env.VITE_AUTH_USERNAME as string | undefined) ?? 'interviewer'
const AUTH_PASSWORD = (import.meta.env.VITE_AUTH_PASSWORD as string | undefined) ?? 'password123'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

let _jwt = JWT ?? ''
let _loginPromise: Promise<string> | null = null

export function setJwt(token: string) {
  _jwt = token
}

async function login(): Promise<string> {
  const body = new URLSearchParams()
  body.set('username', AUTH_USERNAME)
  body.set('password', AUTH_PASSWORD)

  const res = await fetch(`${BASE}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }

  const data = await res.json() as { access_token: string }
  setJwt(data.access_token)
  return data.access_token
}

export async function ensureJwt() {
  if (_jwt) return _jwt
  _loginPromise ??= login().finally(() => {
    _loginPromise = null
  })
  return _loginPromise
}

export async function ensureAudioApiReady() {
  const token = await ensureJwt()
  const res = await fetch(`${BASE}/api/audio/health`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new ApiError(
      res.status,
      'Audio API is not available. Restart/rebuild the backend so /ws/interviews/{id}/audio is registered.'
    )
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await ensureJwt()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...((init.body instanceof FormData) ? {} : { 'Content-Type': 'application/json' }),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, text)
  }

  return res.status === 204 ? (undefined as T) : res.json()
}

interface BackendQuestion {
  id: string
  question_text: string
  category: string | null
  difficulty: string | null
  what_to_listen_for?: string | null
  red_flags?: string | null
}

interface BackendSkills {
  programming_languages?: string[]
  frameworks?: string[]
  databases?: string[]
  tools?: string[]
  soft_skills?: string[]
}

interface BackendResumeStatus {
  parsing_status: string
  parsed_data?: {
    name?: string | null
    current_role?: string | null
    summary?: string | null
    skills?: BackendSkills | null
  } | null
  error_message?: string | null
}

interface BackendEvalStatus {
  status: string
  pdf_url?: string | null
  error_message?: string | null
  result?: {
    communication_score?: number
    skill_matrix?: Array<{ skill: string; demonstrated: string }>
  } | null
}

function mapDifficulty(value: string | null): Question['difficulty'] {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === '1' || normalized.includes('foundational') || normalized.includes('easy')) return 1
  if (normalized === '2' || normalized.includes('intermediate')) return 2
  if (normalized === '3' || normalized.includes('applied') || normalized.includes('medium')) return 3
  if (normalized === '4' || normalized.includes('advanced') || normalized.includes('hard')) return 4
  if (normalized === '5' || normalized.includes('expert')) return 5
  return 3
}

function mapQuestion(q: BackendQuestion): Question {
  return {
    id: q.id,
    text: q.question_text,
    category: q.category ?? 'General',
    difficulty: mapDifficulty(q.difficulty),
    whatToListenFor: q.what_to_listen_for ?? undefined,
    redFlags: q.red_flags ?? undefined,
  }
}

function flattenSkills(skills?: BackendSkills | null): string[] {
  if (!skills) return []
  return [
    ...(skills.programming_languages ?? []),
    ...(skills.frameworks ?? []),
    ...(skills.databases ?? []),
    ...(skills.tools ?? []),
    ...(skills.soft_skills ?? []),
  ]
}

function mapResumeStatus(status: BackendResumeStatus): ResumeStatus {
  const state =
    status.parsing_status === 'complete'
      ? 'ready'
      : status.parsing_status === 'failed'
        ? 'failed'
        : 'parsing'

  const parsed = status.parsed_data
  const skills = flattenSkills(parsed?.skills)

  return {
    state,
    error: status.error_message ?? undefined,
    result: parsed
      ? {
          name: parsed.name ?? parsed.current_role ?? 'Candidate',
          summary: parsed.summary ?? '',
          skills,
          skillCount: skills.length,
        }
      : undefined,
  }
}

function mapEvalStatus(status: BackendEvalStatus): EvalStatus {
  const state =
    status.status === 'complete'
      ? 'ready'
      : status.status === 'failed'
        ? 'failed'
        : 'running'

  const skillRows = status.result?.skill_matrix ?? []
  const demonstrated = skillRows.filter((s) => s.demonstrated === 'demonstrated').length
  const partial = skillRows.filter((s) => s.demonstrated === 'partial').length
  const technicalPct = skillRows.length
    ? Math.round(((demonstrated + partial * 0.5) / skillRows.length) * 100)
    : undefined
  const communicationPct = status.result?.communication_score
    ? Math.round(status.result.communication_score * 10)
    : undefined

  const scoreParts = [communicationPct, technicalPct].filter((v): v is number => v !== undefined)

  return {
    state,
    pdfUrl: status.pdf_url ?? undefined,
    averageScore: scoreParts.length
      ? Math.round(scoreParts.reduce((sum, v) => sum + v, 0) / scoreParts.length)
      : undefined,
    breakdown: [
      communicationPct !== undefined && { label: 'Communication', pct: communicationPct },
      technicalPct !== undefined && { label: 'Technical', pct: technicalPct },
    ].filter((v): v is { label: string; pct: number } => Boolean(v)),
  }
}

export const interviews = {
  create: () =>
    req<Interview>('/api/interviews', { method: 'POST', body: JSON.stringify({}) }),

  get: (id: string) =>
    req<Interview>(`/api/interviews/${id}`),

  uploadResume: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return req<{ interview_id: string; resume_id: string; status: string }>(`/api/interviews/${id}/resume`, {
      method: 'POST',
      body: fd,
      headers: {},
    })
  },

  resumeStatus: (id: string) =>
    req<BackendResumeStatus>(`/api/interviews/${id}/resume/status`).then(mapResumeStatus),

  initialQuestions: (id: string) =>
    req<BackendQuestion[]>(`/api/interviews/${id}/initial-questions`).then((rows) => rows.map(mapQuestion)),

  markAsked: (id: string, qid: string) =>
    req<void>(`/api/interviews/${id}/questions/${qid}/asked`, { method: 'PATCH' }),

  end: (id: string) =>
    req<{ evaluation_id: string }>(`/api/interviews/${id}/end`, { method: 'POST' })
      .then((res) => ({ evaluationId: res.evaluation_id })),
}

export const evaluations = {
  status: (id: string) =>
    req<BackendEvalStatus>(`/api/evaluations/${id}/status`).then(mapEvalStatus),
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
