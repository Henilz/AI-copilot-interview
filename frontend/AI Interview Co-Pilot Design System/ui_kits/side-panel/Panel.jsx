/* Panel.jsx — orchestrates state machine and assembles screens */
const { useState, useEffect, useRef } = React;

// Sample data
const SAMPLE_QUESTIONS = [
  { level: 2, text: 'Tell me about a project where you had to learn a new technology under a tight deadline.' },
  { level: 2, text: 'How do you approach code reviews when you disagree with the author?' },
  { level: 3, text: 'Describe a time you resolved a conflict within your team.' },
  { level: 4, text: 'Walk me through how you\'d design a rate-limiter for an API gateway serving 50k req/sec.' },
  { level: 5, text: 'Walk me through how you\'d design a payments idempotency layer that survives a regional outage.' },
];

function Panel({ scenario }) {
  // scenario: 'idle' | 'interviewing' | 'loading' | 'complete'
  const [elapsed, setElapsed] = useState(scenario === 'interviewing' ? 14*60+32 : scenario === 'loading' ? 18*60+5 : 42*60+18);
  const [listening, setListening] = useState(scenario === 'interviewing');
  const [showToast, setShowToast] = useState(scenario === 'loading');

  useEffect(() => {
    if (scenario === 'idle' || scenario === 'complete') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [scenario]);

  // Auto-dismiss toast after 4s in loading scenario (then reappear for demo loop)
  useEffect(() => {
    if (scenario !== 'loading') return;
    setShowToast(true);
    const t = setTimeout(() => setShowToast(false), 3500);
    const t2 = setTimeout(() => setShowToast(true), 5500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [scenario]);

  if (scenario === 'idle')         return <IdleScreen />;
  if (scenario === 'interviewing') return <InterviewingScreen elapsed={elapsed} listening={listening} setListening={setListening} />;
  if (scenario === 'loading')      return <LoadingScreen elapsed={elapsed} showToast={showToast} />;
  if (scenario === 'complete')     return <CompleteScreen />;
  return null;
}

/* ─── SCREEN 1 · IDLE ─── */
function IdleScreen() {
  const [state, setState] = useState('idle'); // idle | drag | uploading
  return (
    <div className="panel">
      <Header status="idle" subtitle="Waiting for Google Meet…" />
      <div className="panel-body">
        <div style={{height:8}} />
        <UploadZone state={state} onUpload={() => { setState('uploading'); setTimeout(() => setState('idle'), 2500); }} />
        <div className="section" style={{marginTop:'auto'}}>
          <button className="btn btn-primary" disabled>Start Interview</button>
        </div>
        <div className="footer-hint">
          <svg className="gmeet-icon" viewBox="0 0 87 72" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z" fill="#00832d"/>
            <path d="M0 51.5V66c0 3.32 2.68 6 6 6h14.5l3-10.96-3-9.54-9.95-3z" fill="#0066da"/>
            <path d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z" fill="#e94235"/>
            <path d="M0 51.5h20.5v-31H0z" fill="#2684fc"/>
            <path d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.14 4.85-2.37V11.02c0-2.54-2.94-3.93-4.91-2.34zM49.5 36v15.5H20.5V72h43c3.32 0 6-2.68 6-6V53.08z" fill="#00ac47"/>
            <path d="M63.5 0H20.5v20.5h29V36l20-.01V6c0-3.32-2.68-6-6-6z" fill="#ffba00"/>
          </svg>
          <span>Connect to Google Meet to enable audio capture.</span>
        </div>
      </div>
    </div>
  );
}

/* ─── SCREEN 2 · INTERVIEWING ─── */
function InterviewingScreen({ elapsed, listening, setListening }) {
  const q = SAMPLE_QUESTIONS[2]; // Question 3 of 10 — Applied
  const transcriptText = "I think the most challenging conflict I navigated was when two senior engineers on my team disagreed about the migration path for our payments service";
  return (
    <div className="panel">
      <Header status={listening ? 'recording' : 'active'} elapsed={elapsed} showTimer showWave={listening} />
      <div className="panel-body">
        <div style={{height:12}} />
        <DifficultyBar level={q.level} />
        <div style={{height:10}} />
        <QuestionCard index={3} total={10} level={q.level} text={q.text} />
        <div style={{height:10}} />
        <AudioToggle listening={listening} onToggle={() => setListening(l => !l)} />
        <div className="section">
          <Transcript text={transcriptText} listening={listening} />
        </div>
        <div className="section">
          <div className="section-head" style={{marginBottom:8}}><span className="section-title">Answer Evaluation</span></div>
          <ScoreMeter score={78} />
        </div>
        <div className="section" style={{marginTop:'auto',display:'flex',flexDirection:'column',gap:4}}>
          <PrimaryButton trailingIcon="arrow_forward">Next Question</PrimaryButton>
          <EndInterviewLink />
        </div>
      </div>
    </div>
  );
}

/* ─── SCREEN 3 · LOADING / BETWEEN QUESTIONS ─── */
function LoadingScreen({ elapsed, showToast }) {
  return (
    <div className="panel">
      <Header status="active" elapsed={elapsed} showTimer />
      {showToast && (
        <div className="toast-stack">
          <Toast kind="info">Difficulty increased to Hard 🔥</Toast>
        </div>
      )}
      <div className="panel-body">
        <div style={{height:12}} />
        <div className="progress-pill">
          <span>3 / 10 Questions</span>
          <div className="progress-track"><div className="fill" style={{width:'30%'}} /></div>
          <span style={{fontVariantNumeric:'tabular-nums'}}>30%</span>
        </div>
        <div style={{height:14}} />
        <DifficultyBar level={4} />
        <div style={{height:14}} />
        <div className="last-answer">
          <span className="ms material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>check_circle</span>
          <div style={{flex:1}}>
            <div className="lbl">Last Answer</div>
            <div className="val">82 / 100 · Excellent</div>
          </div>
        </div>
        <div style={{height:14}} />
        <div className="sk-card">
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <div className="skeleton" style={{width:80,height:12}} />
            <div className="skeleton" style={{width:60,height:18,borderRadius:9}} />
          </div>
          <div className="skeleton sk-line" style={{width:'92%'}} />
          <div className="skeleton sk-line" style={{width:'78%'}} />
          <div className="skeleton sk-line" style={{width:'40%'}} />
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:14,color:'var(--on-surface-variant)',font:'13px var(--font-sans)'}}>
            <span className="dots"><span/><span/><span/></span>
            <span>Generating next question…</span>
          </div>
        </div>
        <div className="section" style={{marginTop:'auto',display:'flex',flexDirection:'column',gap:4}}>
          <PrimaryButton trailingIcon="arrow_forward" disabled>Next Question</PrimaryButton>
          <EndInterviewLink />
        </div>
      </div>
    </div>
  );
}

/* ─── SCREEN 4 · COMPLETE ─── */
function CompleteScreen() {
  return (
    <div className="panel">
      <Header status="complete" />
      <div className="panel-body">
        <SummaryView />
      </div>
    </div>
  );
}

window.Panel = Panel;
