# AI Interview Copilot — API Documentation

Base URL: `http://localhost:8000`

All endpoints except `/health` and `/api/auth/token` require a **Bearer token** in the `Authorization` header.

---

## Authentication

### POST `/api/auth/token`

**Why it exists:** Every other API call needs a JWT token. This endpoint exchanges a username + password for that token.

**How to call it from the frontend:**
```js
const res = await fetch('/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ username: 'interviewer', password: 'password123' }),
});
const { access_token } = await res.json();
// Store access_token in memory or localStorage
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

> **Note:** Currently uses a hardcoded demo user (`interviewer` / `password123`). Replace with a real user store before production.

---

## Health

### GET `/health`

**Why it exists:** Lets your infrastructure (load balancer, Docker healthcheck, monitoring) verify that the server, database, and Redis are all reachable.

**How to call it from the frontend:**
```js
const res = await fetch('/health');
const data = await res.json();
// data.status === "ok" | "degraded"
```

**Response (all healthy):**
```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok"
}
```

**Response (something down):**
```json
{
  "status": "degraded",
  "database": "error: connection refused",
  "redis": "ok"
}
```

---

## Interviews

All interview endpoints require the `Authorization: Bearer <token>` header.

---

### POST `/api/interviews`

**Why it exists:** Creates a new interview session. Every interview workflow starts here — you get back an `interview_id` that ties together the resume, questions, transcript, and evaluation.

**Request body:**
```json
{
  "candidate_name": "Jane Doe",
  "job_role": "Senior Backend Engineer"
}
```
Both fields are optional.

**How to call it from the frontend:**
```js
const res = await fetch('/api/interviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ candidate_name: 'Jane Doe', job_role: 'Senior Backend Engineer' }),
});
const interview = await res.json();
// Save interview.id — you'll need it for every subsequent call
```

**Response (`201 Created`):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "created",
  "candidate_name": "Jane Doe",
  "job_role": "Senior Backend Engineer",
  "created_at": "2026-05-26T10:00:00",
  "updated_at": "2026-05-26T10:00:00"
}
```

---

### GET `/api/interviews/{interview_id}`

**Why it exists:** Fetches the current state of an interview — useful to restore the UI if the page is refreshed, or to check the status (`created` / `active` / `ended`).

**How to call it from the frontend:**
```js
const res = await fetch(`/api/interviews/${interviewId}`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
const interview = await res.json();
```

**Response:** Same shape as the `POST /api/interviews` response above.

---

### POST `/api/interviews/{interview_id}/resume`

**Why it exists:** Uploads the candidate's resume (PDF or DOCX). The file is handed off to a Celery background worker that parses it and extracts structured data (skills, experience, education). Parsing happens asynchronously — the endpoint returns immediately with `processing` status.

**Accepted formats:** `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`  
**Max size:** 5 MB (configurable via `MAX_FILE_SIZE_MB` in `.env`)

**How to call it from the frontend:**
```js
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const res = await fetch(`/api/interviews/${interviewId}/resume`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData,
});
const data = await res.json();
// data.status === "processing"
// Poll GET /resume/status next
```

**Response (`202 Accepted`):**
```json
{
  "interview_id": "550e8400-...",
  "resume_id": "661f9511-...",
  "status": "processing"
}
```

---

### GET `/api/interviews/{interview_id}/resume/status`

**Why it exists:** Because resume parsing is async (done by a Celery worker), the frontend needs to poll this endpoint to know when parsing is complete before it can request questions.

**How to call it from the frontend:**
```js
// Poll every 2 seconds until status is "complete" or "failed"
const pollResumeStatus = async () => {
  const res = await fetch(`/api/interviews/${interviewId}/resume/status`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();

  if (data.parsing_status === 'complete') {
    // Resume is ready — proceed to generate questions
  } else if (data.parsing_status === 'failed') {
    // Show error: data.error_message
  } else {
    setTimeout(pollResumeStatus, 2000); // still "pending", keep polling
  }
};
```

**Response:**
```json
{
  "interview_id": "550e8400-...",
  "parsing_status": "complete",
  "parsed_data": {
    "name": "Jane Doe",
    "skills": ["Python", "PostgreSQL"],
    "experience": [...],
    "education": [...]
  },
  "error_message": null,
  "updated_at": "2026-05-26T10:01:30"
}
```

`parsing_status` values: `pending` → `complete` | `failed`

---

### GET `/api/interviews/{interview_id}/initial-questions`

**Why it exists:** Once the resume is parsed, this endpoint asks an LLM to generate a set of tailored interview questions based on the candidate's background and job role. Questions are cached so calling it twice doesn't hit the LLM again.

**Prerequisites:** Resume must have `parsing_status === "complete"` first.

**How to call it from the frontend:**
```js
const res = await fetch(`/api/interviews/${interviewId}/initial-questions`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
const questions = await res.json();
// Array of question objects — display in the interviewer's question panel
```

**Response:**
```json
[
  {
    "id": "q-uuid-1",
    "interview_id": "550e8400-...",
    "phase": "initial",
    "question_text": "Walk me through a system you designed from scratch.",
    "category": "system_design",
    "difficulty": "hard",
    "what_to_listen_for": "Clear architecture decisions, trade-off awareness",
    "red_flags": "No mention of scalability or failure handling",
    "order_num": 1,
    "is_asked": false
  }
]
```

---

### PATCH `/api/interviews/{interview_id}/questions/{question_id}/asked`

**Why it exists:** Marks a question as asked so the UI can cross it off and the AI suggestion engine knows not to suggest it again.

**How to call it from the frontend:**
```js
await fetch(`/api/interviews/${interviewId}/questions/${questionId}/asked`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${token}` },
});
```

**Response:**
```json
{
  "id": "q-uuid-1",
  "is_asked": true
}
```

---

### POST `/api/interviews/{interview_id}/end`

**Why it exists:** Signals that the interview is over. This does three things in the background:
1. Flushes any buffered transcript from Redis to the database.
2. Kicks off a Celery job to generate the AI evaluation report.
3. Sets the interview status to `ended`.

**How to call it from the frontend:**
```js
const res = await fetch(`/api/interviews/${interviewId}/end`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
});
const data = await res.json();
// Save data.evaluation_id — use it to poll for the evaluation result
```

**Response (`202 Accepted`):**
```json
{
  "interview_id": "550e8400-...",
  "evaluation_id": "772a1234-...",
  "status": "processing"
}
```

---

## Evaluations

---

### GET `/api/evaluations/{evaluation_id}/status`

**Why it exists:** Polls the status of the AI-generated evaluation report after `POST /end`. The evaluation is built by a Celery worker analyzing the full transcript and resume, so it takes time.

**How to call it from the frontend:**
```js
// Poll every 3 seconds until status is "complete" or "failed"
const pollEvaluation = async () => {
  const res = await fetch(`/api/evaluations/${evaluationId}/status`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();

  if (data.status === 'complete') {
    // data.result has the full evaluation
    // data.pdf_url has the download link (if S3 is configured)
  } else if (data.status === 'failed') {
    // Show error: data.error_message
  } else {
    setTimeout(pollEvaluation, 3000);
  }
};
```

**Response (when complete):**
```json
{
  "id": "772a1234-...",
  "interview_id": "550e8400-...",
  "status": "complete",
  "result": {
    "overall_recommendation": "hire",
    "recommendation_reason": "Strong system design skills and clear communication.",
    "strengths": [
      { "area": "System Design", "description": "...", "transcript_citation": "..." }
    ],
    "weaknesses": [
      { "area": "Testing", "description": "...", "transcript_citation": null }
    ],
    "skill_matrix": [
      { "skill": "Python", "claimed": true, "demonstrated": "demonstrated", "evidence": "..." }
    ],
    "communication_score": 8,
    "communication_notes": "Articulate and concise.",
    "red_flags": [],
    "qa_review": [
      {
        "question": "Walk me through a system you designed...",
        "candidate_response_summary": "...",
        "assessment": "strong",
        "notes": null
      }
    ],
    "suggested_next_round_focus": ["Dive deeper into testing practices"]
  },
  "pdf_url": "https://s3.amazonaws.com/bucket/report.pdf",
  "total_cost_usd": 0.042,
  "error_message": null,
  "created_at": "2026-05-26T10:05:00",
  "completed_at": "2026-05-26T10:05:45"
}
```

`status` values: `pending` → `complete` | `failed`  
`overall_recommendation` values: `hire` | `no_hire` | `maybe`  
`assessment` values: `strong` | `adequate` | `weak`  
`demonstrated` values: `demonstrated` | `partial` | `not_shown`

---

### GET `/api/interviews/{interview_id}/evaluation`

**Why it exists:** Same as the endpoint above but looked up by `interview_id` instead of `evaluation_id`. Useful when you only have the interview ID stored (e.g., when navigating back to a past interview's results page).

**How to call it from the frontend:**
```js
const res = await fetch(`/api/interviews/${interviewId}/evaluation`, {
  headers: { 'Authorization': `Bearer ${token}` },
});
const data = await res.json();
```

**Response:** Same shape as `GET /api/evaluations/{evaluation_id}/status`.

---

## WebSocket — Real-time Interview Session

### WS `/ws/interviews/{interview_id}?token=<jwt>`

**Why it exists:** The live interview screen needs a persistent bidirectional connection to:
- Stream transcript lines from the interviewer to the server as the candidate speaks
- Receive real-time AI suggestions without polling
- Get heartbeat pings to keep the connection alive

**How to connect from the frontend:**
```js
const ws = new WebSocket(`ws://localhost:8000/ws/interviews/${interviewId}?token=${token}`);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  handleServerMessage(msg);
};
```

---

#### Messages you receive FROM the server

| `type` | When | Payload fields |
|---|---|---|
| `connected` | Right after connection opens | `interview_id`, `transcript_buffered`, `initial_questions` |
| `transcript_ack` | After each transcript message you send | `sequence` (running count) |
| `ping` | Every 30 seconds | — |
| `suggestion_start` | When AI starts generating suggestions | — |
| `suggestion_token` | Each streamed token from the AI | `token` |
| `suggestion_complete` | When full suggestion set is ready | `suggestions` array |
| `suggestion_error` | If AI call fails | `message` |
| `error` | Invalid message or rate limit hit | `message` |

---

#### Messages you send TO the server

**1. Send a transcript line** (call this whenever the candidate or interviewer finishes a sentence):
```js
ws.send(JSON.stringify({
  type: 'transcript',
  speaker: 'candidate',       // "candidate" | "interviewer"
  text: 'I used a microservices architecture...',
  timestamp: new Date().toISOString(),
}));
```

**2. Request AI suggestions** (e.g. on a button press — has a rate limit):
```js
ws.send(JSON.stringify({ type: 'request_suggestions' }));
// You'll receive: suggestion_start → N×suggestion_token → suggestion_complete
```

**3. Mark a question as asked** (same as the REST endpoint but via WS):
```js
ws.send(JSON.stringify({
  type: 'question_asked',
  question_id: 'q-uuid-1',
}));
```

**4. Respond to heartbeat pings:**
```js
// In your onmessage handler:
if (msg.type === 'ping') {
  ws.send(JSON.stringify({ type: 'pong' }));
}
```

---

## Typical Frontend Flow

```
1. POST /api/auth/token                   → get access_token
2. POST /api/interviews                   → get interview_id
3. POST /api/interviews/:id/resume        → upload resume
4. Poll GET /api/interviews/:id/resume/status  → wait for "complete"
5. GET  /api/interviews/:id/initial-questions  → load question panel
6. WS   /ws/interviews/:id?token=...      → open live session
   ├─ Send transcript lines as candidate speaks
   ├─ Send request_suggestions when you want AI help
   └─ Send question_asked when a question is used
7. POST /api/interviews/:id/end           → get evaluation_id
8. Poll GET /api/evaluations/:eval_id/status  → wait for "complete"
9. Display evaluation result + PDF link
```
