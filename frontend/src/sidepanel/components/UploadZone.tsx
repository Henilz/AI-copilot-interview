import { useRef, useState } from 'react'
import { RESUME_ACCEPT_TYPES, RESUME_MAX_SIZE_BYTES } from '../../shared/constants'

export type UploadState = 'idle' | 'drag' | 'uploading'

interface UploadZoneProps {
  state: UploadState
  onFile: (file: File) => void
}

export function UploadZone({ state, onFile }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isUploading = state === 'uploading'
  const isDrag = dragOver || state === 'drag'

  function handleFile(file: File) {
    if (file.size > RESUME_MAX_SIZE_BYTES) {
      alert('File exceeds 10 MB. Please upload a smaller resume.')
      return
    }
    onFile(file)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function onDragLeave() {
    setDragOver(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <>
      <div
        className={`upload ${isDrag ? 'drag' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload resume"
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isUploading && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span
          className="ms-cloud material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 40" }}
        >
          {isUploading ? 'progress_activity' : 'cloud_upload'}
        </span>

        <div className="upload-title">
          {isUploading
            ? 'Parsing resume…'
            : isDrag
            ? 'Drop to upload'
            : 'Upload Resume to Begin'}
        </div>

        <div className="upload-sub">
          {isUploading
            ? 'Extracting skills and experience'
            : 'Drag & drop PDF or DOCX, or click to browse'}
        </div>

        {isUploading && (
          <div className="upload-progress">
            <div className="bar" />
          </div>
        )}
      </div>

      {!isUploading && (
        <p className="upload-meta">SUPPORTED · PDF, DOCX · MAX 10 MB</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={RESUME_ACCEPT_TYPES}
        style={{ display: 'none' }}
        onChange={onInputChange}
        aria-hidden
      />
    </>
  )
}
