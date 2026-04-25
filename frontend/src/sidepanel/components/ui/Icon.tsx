interface IconProps {
  name: string
  size?: number
  className?: string
  fill?: boolean
  style?: React.CSSProperties
}

export function Icon({ name, size = 20, className = '', fill = false, style }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: fill ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 40" : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  )
}
