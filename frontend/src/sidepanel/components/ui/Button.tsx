import { Icon } from './Icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'end-link'
  leadingIcon?: string
  trailingIcon?: string
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  leadingIcon,
  trailingIcon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const cls =
    variant === 'primary'
      ? 'btn btn-primary'
      : variant === 'secondary'
      ? 'btn btn-secondary'
      : 'link-end'

  return (
    <button className={`${cls} ${className}`} {...props}>
      {leadingIcon && <Icon name={leadingIcon} size={18} />}
      <span>{children}</span>
      {trailingIcon && <Icon name={trailingIcon} size={18} />}
    </button>
  )
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  label: string
}

export function IconButton({ icon, label, className = '', ...props }: IconButtonProps) {
  return (
    <button className={`icon-btn ${className}`} title={label} aria-label={label} {...props}>
      <Icon name={icon} size={18} />
    </button>
  )
}
