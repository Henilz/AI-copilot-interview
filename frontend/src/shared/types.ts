export interface Question {
  id: string;
  text: string;
  category: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface ResumeParseResult {
  name: string;
  summary: string;
  skills: string[];
  skillCount: number;
}

export interface ResumeStatus {
  state: 'parsing' | 'ready' | 'failed';
  error?: string;
  result?: ResumeParseResult;
}

export interface EvalStatus {
  state: 'running' | 'ready' | 'failed';
  pdfUrl?: string;
  averageScore?: number;
  breakdown?: Array<{ label: string; pct: number }>;
}

export interface TranscriptEntry {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
  questionId?: string;
}

export interface LiveFeedback {
  score: number;
  strengths: string[];
  suggestion?: string;
  questionId: string;
}

export interface Interview {
  id: string;
  status: string;
}

export type Phase =
  | 'READY_TO_UPLOAD'
  | 'RESUME_PARSING'
  | 'RESUME_READY'
  | 'QUESTIONS_READY'
  | 'IN_PROGRESS'
  | 'BETWEEN_QUESTIONS'
  | 'ENDING'
  | 'REPORT_READY'
  | 'ERROR';

export type WsStatus = 'IDLE' | 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'ERROR';

export type OutboundMessage =
  | { type: 'transcript_chunk'; text: string; isFinal: boolean; t: number; questionId?: string }
  | { type: 'question_asked'; questionId: string }
  | { type: 'ping' };

export type InboundMessage =
  | { type: 'score_update'; questionId: string; score: number; strengths: string[] }
  | { type: 'next_question_suggestion'; question: string }
  | { type: 'live_feedback'; text: string; questionId?: string; score?: number }
  | { type: 'pong' };

export interface PollOpts {
  intervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type ToastKind = 'info' | 'ok' | 'err';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}
