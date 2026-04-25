import { Icon } from './ui/Icon'

interface AudioToggleProps {
  listening: boolean
  onToggle: () => void
}

export function AudioToggle({ listening, onToggle }: AudioToggleProps) {
  return (
    <button
      className={`audio-btn${listening ? ' live' : ''}`}
      onClick={onToggle}
      aria-pressed={listening}
      aria-label={listening ? 'Stop listening' : 'Start listening'}
    >
      {listening ? (
        <>
          <Icon name="radio_button_checked" size={18} />
          <span>Stop Listening</span>
          <span className="wave" aria-hidden>
            <span /><span /><span /><span />
          </span>
        </>
      ) : (
        <>
          <Icon name="mic" size={18} />
          <span>Listen to Answer</span>
        </>
      )}
    </button>
  )
}
