/* QuestionCard.jsx + DifficultyBar.jsx */

const DIFFICULTY_LEVELS = [
  { id: 1, name: 'Foundational', color: 'var(--difficulty-1)', badgeBg: '#DBEAFE', badgeFg: '#1E40AF' },
  { id: 2, name: 'Intermediate', color: 'var(--difficulty-2)', badgeBg: '#D1FAE5', badgeFg: '#065F46' },
  { id: 3, name: 'Applied',      color: 'var(--difficulty-3)', badgeBg: 'var(--warning-light)', badgeFg: '#9A6700' },
  { id: 4, name: 'Advanced',     color: 'var(--difficulty-4)', badgeBg: 'var(--error-light)',   badgeFg: '#A50E0E' },
  { id: 5, name: 'Expert',       color: 'var(--difficulty-5)', badgeBg: 'var(--purple-light)',  badgeFg: 'var(--purple)' },
];

function QuestionCard({ index = 3, total = 10, level = 3, text, onRegen, onCopy }) {
  const lvl = DIFFICULTY_LEVELS[level - 1];
  return (
    <div className="q-card">
      <div className="q-accent" style={{background: lvl.color}} />
      <div className="q-top">
        <span className="q-counter">Question {index} of {total}</span>
        <span className="q-badge" style={{background: lvl.badgeBg, color: lvl.badgeFg}}>{lvl.name}</span>
      </div>
      <p className="q-text">{text}</p>
      <div className="q-actions">
        <button className="icon-btn" title="Regenerate" onClick={onRegen}><span className="ms material-symbols-outlined">refresh</span></button>
        <button className="icon-btn" title="Copy" onClick={onCopy}><span className="ms material-symbols-outlined">content_copy</span></button>
      </div>
    </div>
  );
}

function DifficultyBar({ level = 3 }) {
  const lvl = DIFFICULTY_LEVELS[level - 1];
  return (
    <div className="diff" style={{'--c': lvl.color}}>
      <div className="diff-head">
        <span className="diff-title">Dynamic Difficulty</span>
        <span className="diff-level" style={{color: lvl.color}}>{lvl.name}</span>
      </div>
      <div className="diff-pips">
        {DIFFICULTY_LEVELS.map((l, i) => {
          const on = i + 1 <= level;
          const cur = i + 1 === level;
          return (
            <div
              key={l.id}
              className={`diff-pip ${on ? 'on' : ''} ${cur ? 'cur' : ''}`}
              style={on ? {background: lvl.color} : null}
            />
          );
        })}
      </div>
    </div>
  );
}

window.DIFFICULTY_LEVELS = DIFFICULTY_LEVELS;
window.QuestionCard = QuestionCard;
window.DifficultyBar = DifficultyBar;
