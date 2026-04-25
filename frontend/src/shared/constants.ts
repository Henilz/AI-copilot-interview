export const DIFFICULTY_LEVELS = [
  { id: 1 as const, name: 'Foundational', color: 'var(--difficulty-1)', badgeBg: '#DBEAFE', badgeFg: '#1E40AF' },
  { id: 2 as const, name: 'Intermediate', color: 'var(--difficulty-2)', badgeBg: '#D1FAE5', badgeFg: '#065F46' },
  { id: 3 as const, name: 'Applied',      color: 'var(--difficulty-3)', badgeBg: 'var(--warning-light)', badgeFg: '#9A6700' },
  { id: 4 as const, name: 'Advanced',     color: 'var(--difficulty-4)', badgeBg: 'var(--error-light)',   badgeFg: '#A50E0E' },
  { id: 5 as const, name: 'Expert',       color: 'var(--difficulty-5)', badgeBg: 'var(--purple-light)',  badgeFg: 'var(--purple)' },
] as const;

export const STORAGE_KEY = 'ai-copilot-state';

export const POLL_RESUME_INTERVAL_MS  = 1_500;
export const POLL_RESUME_TIMEOUT_MS   = 60_000;
export const POLL_EVAL_INTERVAL_MS    = 2_000;
export const POLL_EVAL_TIMEOUT_MS     = 120_000;

export const WS_HEARTBEAT_INTERVAL_MS = 25_000;
export const WS_RECONNECT_BASE_MS     = 1_000;
export const WS_RECONNECT_MAX_MS      = 30_000;
export const WS_QUEUE_MAX             = 200;

export const TRANSCRIPT_THROTTLE_MS   = 200;
export const RESUME_MAX_SIZE_BYTES     = 10 * 1024 * 1024; // 10 MB
export const RESUME_ACCEPT_TYPES       = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
