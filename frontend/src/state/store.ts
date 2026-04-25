import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Phase,
  Question,
  TranscriptEntry,
  LiveFeedback,
  WsStatus,
  ToastItem,
  OutboundMessage,
} from '../shared/types'
import { STORAGE_KEY } from '../shared/constants'

const chromeAsyncStorage = {
  getItem: (key: string): Promise<string | null> =>
    new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key] ?? null))
    }),
  setItem: (key: string, value: string): Promise<void> =>
    new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve)
    }),
  removeItem: (key: string): Promise<void> =>
    new Promise((resolve) => {
      chrome.storage.local.remove([key], resolve)
    }),
}

interface Store {
  // ── Persisted state ──────────────────────────────────
  phase: Phase
  interviewId?: string
  evaluationId?: string
  questions: Question[]
  askedQuestionIds: string[]
  currentQuestionIndex: number

  // ── In-memory state ──────────────────────────────────
  transcript: TranscriptEntry[]
  partialTranscript: string
  liveFeedback?: LiveFeedback
  evaluationPdfUrl?: string
  evaluationBreakdown?: Array<{ label: string; pct: number }>
  averageScore?: number
  sessionElapsed: number
  wsStatus: WsStatus
  error?: string
  resumeName?: string
  resumeSummary?: string
  resumeSkills: string[]
  toasts: ToastItem[]

  // ── WS send bridge (set by useWebSocket hook) ────────
  _sendWs?: (msg: OutboundMessage) => void

  // ── Actions ──────────────────────────────────────────
  setPhase: (phase: Phase) => void
  setInterviewId: (id: string) => void
  setEvaluationId: (id: string) => void
  setQuestions: (questions: Question[]) => void
  markAsked: (questionId: string) => void
  setCurrentQuestionIndex: (index: number) => void
  addFinalTranscript: (entry: TranscriptEntry) => void
  setPartialTranscript: (text: string) => void
  setLiveFeedback: (feedback: LiveFeedback) => void
  setEvaluationResult: (
    pdfUrl: string,
    breakdown?: Array<{ label: string; pct: number }>,
    avgScore?: number
  ) => void
  setWsStatus: (status: WsStatus) => void
  setError: (error: string | undefined) => void
  setResumeInfo: (name: string, summary: string, skills: string[]) => void
  incrementElapsed: () => void
  addToast: (kind: ToastItem['kind'], message: string) => void
  removeToast: (id: string) => void
  setSendWs: (fn: (msg: OutboundMessage) => void) => void
  sendWs: (msg: OutboundMessage) => void
  reset: () => void
}

const initialState = {
  phase: 'READY_TO_UPLOAD' as Phase,
  interviewId: undefined,
  evaluationId: undefined,
  questions: [],
  askedQuestionIds: [],
  currentQuestionIndex: 0,
  transcript: [],
  partialTranscript: '',
  liveFeedback: undefined,
  evaluationPdfUrl: undefined,
  evaluationBreakdown: undefined,
  averageScore: undefined,
  sessionElapsed: 0,
  wsStatus: 'IDLE' as WsStatus,
  error: undefined,
  resumeName: undefined,
  resumeSummary: undefined,
  resumeSkills: [],
  toasts: [],
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      setPhase: (phase) => set({ phase }),
      setInterviewId: (id) => set({ interviewId: id }),
      setEvaluationId: (id) => set({ evaluationId: id }),
      setQuestions: (questions) => set({ questions }),

      markAsked: (questionId) =>
        set((s) => ({
          askedQuestionIds: s.askedQuestionIds.includes(questionId)
            ? s.askedQuestionIds
            : [...s.askedQuestionIds, questionId],
        })),

      setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

      addFinalTranscript: (entry) =>
        set((s) => ({ transcript: [...s.transcript, entry], partialTranscript: '' })),

      setPartialTranscript: (text) => set({ partialTranscript: text }),

      setLiveFeedback: (feedback) => set({ liveFeedback: feedback }),

      setEvaluationResult: (pdfUrl, breakdown, avgScore) =>
        set({ evaluationPdfUrl: pdfUrl, evaluationBreakdown: breakdown, averageScore: avgScore }),

      setWsStatus: (status) => set({ wsStatus: status }),
      setError: (error) => set({ error }),

      setResumeInfo: (name, summary, skills) =>
        set({ resumeName: name, resumeSummary: summary, resumeSkills: skills }),

      incrementElapsed: () => set((s) => ({ sessionElapsed: s.sessionElapsed + 1 })),

      addToast: (kind, message) =>
        set((s) => ({
          toasts: [...s.toasts, { id: crypto.randomUUID(), kind, message }],
        })),

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      setSendWs: (fn) => set({ _sendWs: fn }),

      sendWs: (msg) => get()._sendWs?.(msg),

      reset: () =>
        set({
          ...initialState,
          // keep toasts cleared too
          toasts: [],
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => chromeAsyncStorage),
      // Only persist the fields needed to survive panel close/reopen
      partialize: (s) => ({
        phase: s.phase,
        interviewId: s.interviewId,
        evaluationId: s.evaluationId,
        questions: s.questions,
        askedQuestionIds: s.askedQuestionIds,
        currentQuestionIndex: s.currentQuestionIndex,
        resumeName: s.resumeName,
        resumeSummary: s.resumeSummary,
        resumeSkills: s.resumeSkills,
        sessionElapsed: s.sessionElapsed,
      }),
    }
  )
)
