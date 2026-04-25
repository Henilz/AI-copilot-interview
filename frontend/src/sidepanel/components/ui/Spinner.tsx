interface SpinnerProps {
  size?: number
  color?: string
}

export function Spinner({ size = 20, color = 'var(--primary)' }: SpinnerProps) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        color,
        animation: 'spin 1s linear infinite',
        display: 'inline-block',
      }}
    >
      progress_activity
    </span>
  )
}
