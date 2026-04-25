/* ScoreMeter.jsx + EvalTags.jsx + Transcript.jsx + AudioToggle.jsx */

function ScoreMeter({ score = 78, size = 72 }) {
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--error)';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Work';
  const labelColor = score >= 80 ? 'var(--success)' : score >= 60 ? '#9A6700' : 'var(--error)';

  return (
    <div className="score-row">
      <div className="score-ring" style={{width: size, height: size}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" strokeWidth="4" stroke="var(--outline-variant)" />
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" strokeWidth="4" strokeLinecap="round"
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{transition: 'stroke-dashoffset 600ms var(--ease-out)'}}
          />
        </svg>
        <div className="score-num"><span className="n">{score}<small>/100</small></span></div>
      </div>
      <div className="score-meta">
        <div className="score-label" style={{color: labelColor}}>{label}</div>
        <EvalTags score={score} />
      </div>
    </div>
  );
}

function EvalTags({ score }) {
  const tags = score >= 80
    ? [['pos','Structured'], ['pos','Specific'], ['pos','On-topic']]
    : score >= 60
    ? [['pos','Structured'], ['pos','Specific'], ['warn','Needs depth']]
    : [['warn','Vague'], ['neg','Off-topic']];
  const prefix = { pos: '✅', warn: '⚠️', neg: '✗' };
  return (
    <div className="tag-row">
      {tags.map(([k, t]) => (
        <span key={t} className={`eval-tag ${k}`}>{prefix[k]} {t}</span>
      ))}
    </div>
  );
}

function Transcript({ text, listening }) {
  const empty = !text;
  return (
    <div>
      <div className="section-head" style={{marginBottom:6}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span className="ms material-symbols-outlined" style={{fontSize:16,color: listening ? 'var(--success)' : 'var(--on-surface-subtle)'}}>{listening ? 'graphic_eq' : 'mic_off'}</span>
          <span className="section-title">Live Transcript</span>
        </div>
      </div>
      <div className="transcript">
        {empty
          ? <span className="placeholder">Transcript will appear here when listening…</span>
          : <>{text}{listening && <span className="cursor-blink" />}</>}
      </div>
    </div>
  );
}

function AudioToggle({ listening, onToggle }) {
  return (
    <button className={`audio-btn ${listening ? 'live' : ''}`} onClick={onToggle}>
      {listening ? (
        <>
          <span className="ms material-symbols-outlined">radio_button_checked</span>
          <span>Stop Listening</span>
          <span className="wave"><span/><span/><span/><span/></span>
        </>
      ) : (
        <>
          <span className="ms material-symbols-outlined">mic</span>
          <span>Listen to Answer</span>
        </>
      )}
    </button>
  );
}

window.ScoreMeter = ScoreMeter;
window.EvalTags = EvalTags;
window.Transcript = Transcript;
window.AudioToggle = AudioToggle;
