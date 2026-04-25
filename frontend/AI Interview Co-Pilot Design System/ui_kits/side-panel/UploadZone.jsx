/* UploadZone.jsx — idle and uploading states */
function UploadZone({ state = 'idle', onUpload }) {
  // state: 'idle' | 'drag' | 'uploading'
  const isUploading = state === 'uploading';
  const isDrag = state === 'drag';
  return (
    <>
      <div
        className={`upload ${isDrag ? 'drag' : ''}`}
        onClick={() => !isUploading && onUpload && onUpload()}
        role="button"
      >
        <span className="ms-cloud material-symbols-outlined">
          {isUploading ? 'progress_activity' : 'cloud_upload'}
        </span>
        <div className="upload-title">
          {isUploading ? 'Parsing resume…' : isDrag ? 'Drop to upload' : 'Upload Resume to Begin'}
        </div>
        <div className="upload-sub">
          {isUploading ? 'Extracting skills and experience' : 'Drag & drop PDF or DOCX, or click to browse'}
        </div>
        {isUploading && <div className="upload-progress"><div className="bar" /></div>}
      </div>
      {!isUploading && <div className="upload-meta">SUPPORTED · PDF, DOCX</div>}
    </>
  );
}

function ResumeCard({ name = 'Priya Ramanathan', summary = 'Senior Backend Engineer · 7 yrs · Distributed systems', skills = ['Go', 'Kubernetes', 'PostgreSQL', 'gRPC', 'Kafka', 'AWS'] }) {
  return (
    <div className="resume-card">
      <div className="resume-row">
        <div className="resume-icon"><span className="ms material-symbols-outlined">description</span></div>
        <div>
          <div className="resume-name">{name}</div>
          <div style={{font:'12px var(--font-sans)',color:'var(--on-surface-variant)'}}>Resume parsed · 12 skills detected</div>
        </div>
      </div>
      <p className="resume-summary">{summary}</p>
      <div className="skill-row">
        {skills.map(s => <span key={s} className="skill">{s}</span>)}
      </div>
    </div>
  );
}

window.UploadZone = UploadZone;
window.ResumeCard = ResumeCard;
