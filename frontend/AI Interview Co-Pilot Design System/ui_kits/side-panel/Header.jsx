/* Header.jsx — panel header with brand + status + timer */
const { useEffect, useState } = React;

function StatusDot({ state }) {
  // state: 'idle' | 'active' | 'recording'
  return <span className={`status-dot ${state === 'active' ? 'active' : state === 'recording' ? 'recording' : ''}`} />;
}

function HeaderWaveform({ show }) {
  if (!show) return null;
  return (
    <span className="wave wave-header" aria-hidden>
      <span/><span/><span/><span/>
    </span>
  );
}

function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function Header({ status = 'idle', subtitle, elapsed = 0, showWave = false, showTimer = false }) {
  // status: 'idle' | 'active' | 'recording' | 'complete'
  const statusText = {
    idle: 'Waiting for Meet…',
    active: 'Session Active',
    recording: 'Recording',
    complete: 'Complete',
  }[status];
  const statusClass = status === 'active' || status === 'recording' ? 'active' : '';

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark"><span className="ms">smart_toy</span></div>
        <div className="brand-text">
          <div className="brand-title">AI Interview Co-Pilot</div>
          {subtitle && <div className="brand-sub">{subtitle}</div>}
        </div>
      </div>
      <div className="header-meta">
        <HeaderWaveform show={showWave} />
        <span className="status">
          <StatusDot state={status === 'recording' ? 'recording' : status === 'active' ? 'active' : 'idle'} />
          <span className={`status-text ${statusClass}`}>{statusText}</span>
        </span>
        {showTimer && <span className="timer">{fmtTime(elapsed)}</span>}
      </div>
    </header>
  );
}

window.Header = Header;
window.fmtTime = fmtTime;
