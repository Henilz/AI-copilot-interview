import { useEffect } from 'react'
import { Icon } from './Icon'
import { useStore } from '../../../state/store'
import type { ToastKind } from '../../../shared/types'

const ICON_MAP: Record<ToastKind, string> = {
  info: 'trending_up',
  ok:   'check_circle',
  err:  'error',
}

interface ToastProps {
  id: string
  kind: ToastKind
  message: string
}

export function Toast({ id, kind, message }: ToastProps) {
  const removeToast = useStore((s) => s.removeToast)

  useEffect(() => {
    const t = setTimeout(() => removeToast(id), 3_500)
    return () => clearTimeout(t)
  }, [id, removeToast])

  return (
    <div className={`toast ${kind}`} role="status" aria-live="polite">
      <Icon name={ICON_MAP[kind]} size={18} />
      <span>{message}</span>
    </div>
  )
}

export function ToastStack() {
  const toasts = useStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} />
      ))}
    </div>
  )
}
