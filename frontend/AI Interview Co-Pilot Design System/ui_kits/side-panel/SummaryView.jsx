/* Toast.jsx + Buttons.jsx + SummaryView.jsx */

function Toast({ kind = 'info', icon, children }) {
  const defaultIcon = { info: 'trending_up', ok: 'check_circle', err: 'error' }[kind];
  return (
    <div className={`toast ${kind}`}>
      <span className="ms material-symbols-outlined">{icon || defaultIcon}</span>
      <span>{children}</span>
    </div>
  );
}

function PrimaryButton({ children, icon, trailingIcon, ...props }) {
  return (
    <button className="btn btn-primary" {...props}>
      {icon && <span className="ms material-symbols-outlined">{icon}</span>}
      <span>{children}</span>
      {trailingIcon && <span className="ms material-symbols-outlined">{trailingIcon}</span>}
    </button>
  );
}

function SecondaryButton({ children, icon, ...props }) {
  return (
    <button className="btn btn-secondary" {...props}>
      {icon && <span className="ms material-symbols-outlined">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

function EndInterviewLink({ onClick }) {
  return <button className="link-end" onClick={onClick}>End Interview</button>;
}

function StatCard({ value, suffix, label }) {
  return (
    <div className="stat">
      <div className="v">{value}{suffix && <small>{suffix}</small>}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function PerfRow({ label, pct }) {
  return (
    <div className="perf-row">
      <span className="perf-label">{label}</span>
      <div className="perf-track"><div className="perf-fill" style={{width: `${pct}%`}} /></div>
      <span className="perf-pct">{pct}%</span>
    </div>
  );
}

function Confetti() {
  const colors = ['#1A73E8', '#34A853', '#FBBC04', '#EA4335', '#7C3AED'];
  const dots = Array.from({length: 14}, (_, i) => ({
    left: `${(i * 7 + 5) % 100}%`,
    delay: `${(i % 5) * 0.3}s`,
    color: colors[i % colors.length],
  }));
  return (
    <div className="confetti" aria-hidden>
      {dots.map((d, i) => (
        <i key={i} style={{left: d.left, top: '0', background: d.color, animationDelay: d.delay}} />
      ))}
    </div>
  );
}

function SummaryView({ avgScore = 76, questions = '10/10', duration = '00:42:18', breakdown }) {
  const rows = breakdown || [
    ['Communication', 82],
    ['Technical', 71],
    ['Problem Solving', 79],
    ['Cultural Fit', 85],
  ];
  return (
    <>
      <div className="summary-hero">
        <Confetti />
        <div className="summary-check"><span className="ms material-symbols-outlined">check</span></div>
        <div className="summary-title">Interview Complete!</div>
        <div className="summary-sub">Nice work — here's how it went.</div>
      </div>
      <div className="stats-row">
        <StatCard value={avgScore} suffix="/100" label="Average Score" />
        <StatCard value={questions} label="Questions" />
        <StatCard value={duration} label="Duration" />
      </div>
      <div className="section">
        <div className="section-head"><span className="section-title">Performance Breakdown</span></div>
        <div className="perf">
          {rows.map(([l, p]) => <PerfRow key={l} label={l} pct={p} />)}
        </div>
      </div>
      <div className="section" style={{display:'flex',flexDirection:'column',gap:8}}>
        <PrimaryButton icon="download">Download PDF Report</PrimaryButton>
        <SecondaryButton icon="refresh">Start New Interview</SecondaryButton>
      </div>
    </>
  );
}

window.Toast = Toast;
window.PrimaryButton = PrimaryButton;
window.SecondaryButton = SecondaryButton;
window.EndInterviewLink = EndInterviewLink;
window.StatCard = StatCard;
window.PerfRow = PerfRow;
window.SummaryView = SummaryView;
window.Confetti = Confetti;
