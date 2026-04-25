# AI Interview Copilot — Backend

Python + FastAPI backend for an AI-assisted technical interview tool. Helps non-technical interviewers conduct thorough technical interviews by generating context-aware questions, streaming real-time suggestions, and producing a structured evaluation report.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running the Server](#running-the-server)
- [API Reference](#api-reference)
- [WebSocket Protocol](#websocket-protocol)
- [LLM Usage & Cost](#llm-usage--cost)
- [Background Jobs](#background-jobs)
- [Database Migrations](#database-migrations)

---

## Architecture Overview

```
Browser / Extension
        │
        ├── REST  ──►  FastAPI  ──►  Postgres (SQLAlchemy async)
        │                   │
        │                   ├──►  Redis (session cache, transcript buffer)
        │                   │
        └── WebSocket ──►  FastAPI  ◄──  Celery Worker
                                │              │
                                │              ├──► OpenAI GPT-4o-mini (parse, questions, suggestions)
                                │              ├──► OpenAI GPT-4o      (final evaluation)
                                │              ├──► WeasyPrint          (PDF)
                                │              └──► S3                  (PDF storage)
                                │
                            Redis pub/sub  ◄── Celery notifies WS when evaluation is ready
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web framework | FastAPI + Uvicorn |
| Database | PostgreSQL + SQLAlchemy 2 (async) |
| Cache / session | Redis |
| Task queue | Celery + Redis broker |
| LLM | OpenAI GPT-4o-mini (cost) + GPT-4o (eval quality) |
| Resume parsing | pdfplumber, python-docx, pytesseract (OCR fallback) |
| PDF generation | WeasyPrint + Jinja2 |
| Object storage | AWS S3 (boto3) |
| Auth | JWT (python-jose) + bcrypt |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, lifespan, middleware, router registration
│   ├── config.py                # Pydantic-settings — all env vars in one place
│   ├── database.py              # Async SQLAlchemy engine + session factory
│   ├── redis_client.py          # Redis helpers (get, set, rpush, lrange, pub/sub)
│   ├── celery_app.py            # Celery instance + config
│   │
│   ├── models/                  # SQLAlchemy ORM models (Postgres tables)
│   │   ├── interview.py         # interviews
│   │   ├── resume.py            # resumes
│   │   ├── question.py          # questions (initial + suggested)
│   │   ├── transcript.py        # transcripts + rolling_summaries
│   │   └── evaluation.py        # evaluations
│   │
│   ├── schemas/                 # Pydantic schemas (request/response + LLM output validation)
│   │   ├── interview.py
│   │   ├── resume.py            # ParsedResume — validated against LLM JSON output
│   │   ├── question.py          # InitialQuestionSet, SuggestionSet
│   │   ├── transcript.py
│   │   └── evaluation.py        # EvaluationResult — full structured report schema
│   │
│   ├── routers/                 # FastAPI route handlers
│   │   ├── auth.py              # POST /api/auth/token
│   │   ├── interviews.py        # Interview CRUD, resume upload, question generation
│   │   ├── evaluations.py       # Evaluation status polling
│   │   └── websocket.py         # WS /ws/interviews/{id}
│   │
│   ├── services/                # Business logic / LLM calls
│   │   ├── resume_parser.py     # GPT-4o-mini resume → structured JSON
│   │   ├── question_generator.py # GPT-4o-mini → 10-12 initial questions
│   │   ├── suggestion_generator.py # GPT-4o-mini streaming suggestions + rolling summaries
│   │   ├── evaluation_generator.py # GPT-4o final evaluation (sync, for Celery)
│   │   ├── pdf_generator.py     # WeasyPrint HTML → PDF bytes
│   │   └── s3_service.py        # boto3 upload + pre-signed URL
│   │
│   ├── tasks/                   # Celery async tasks
│   │   ├── resume_tasks.py      # parse_resume_task
│   │   └── evaluation_tasks.py  # generate_evaluation_task
│   │
│   └── utils/
│       ├── auth.py              # JWT create/decode, password hashing
│       ├── file_utils.py        # PDF/DOCX text extraction, OCR fallback
│       ├── cost_tracker.py      # Token counting + dollar-cost calculation
│       └── ws_manager.py        # WebSocket connection manager + Redis pub/sub bridge
│
├── templates/
│   └── evaluation_report.html   # Jinja2 HTML template for the PDF report
│
├── alembic/                     # Database migrations
│   ├── env.py
│   └── versions/
│
├── alembic.ini
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Setup & Installation

### Prerequisites

- Python 3.12+
- PostgreSQL 15+
- Redis 7+
- Tesseract OCR (optional, for scanned PDF fallback)

### Local setup

```bash
# 1. Clone and enter backend directory
cd backend

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and fill in env vars
cp .env.example .env
# Edit .env with your OPENAI_API_KEY, DATABASE_URL, etc.

# 5. Create the database
createdb interview_copilot       # or via psql

# 6. Run migrations
alembic upgrade head

# 7. Start the API server
uvicorn app.main:app --reload --port 8000

# 8. In a separate terminal — start the Celery worker
celery -A app.celery_app worker --loglevel=info
```

### Docker (recommended)

```bash
cd backend
cp .env.example .env             # fill in OPENAI_API_KEY at minimum
docker-compose up --build
```

This starts:
- `api` on port **8000**
- `celery_worker` consuming from Redis
- `postgres` on port **5432**
- `redis` on port **6379**

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | **Yes** | — | Your OpenAI API key |
| `DATABASE_URL` | Yes | postgres://... | Async DB URL (`postgresql+asyncpg://...`) |
| `SYNC_DATABASE_URL` | Yes | postgres://... | Sync DB URL for Celery (`postgresql+psycopg2://...`) |
| `REDIS_URL` | Yes | redis://localhost:6379/0 | Redis connection string |
| `SECRET_KEY` | Yes | (insecure default) | JWT signing secret — use `openssl rand -hex 32` |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `AWS_ACCESS_KEY_ID` | No | — | Required for PDF S3 upload |
| `AWS_SECRET_ACCESS_KEY` | No | — | Required for PDF S3 upload |
| `AWS_BUCKET_NAME` | No | interview-copilot-reports | S3 bucket for PDFs |
| `AWS_REGION` | No | us-east-1 | S3 region |
| `MAX_FILE_SIZE_MB` | No | 5 | Resume upload size limit |
| `SUGGESTION_RATE_LIMIT_SECONDS` | No | 10 | Cooldown between suggestion requests |
| `ROLLING_SUMMARY_INTERVAL` | No | 10 | Trigger rolling summary every N exchanges |

---

## Running the Server

```bash
# Development (auto-reload)
uvicorn app.main:app --reload --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Celery worker
celery -A app.celery_app worker --loglevel=info --concurrency=4

# Interactive API docs (after server starts)
open http://localhost:8000/docs
```

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/token` | `username`, `password` (form) | Get JWT bearer token |

Demo credentials: `interviewer` / `password123`

All other endpoints require `Authorization: Bearer <token>`.

---

### Interviews

#### Create an interview
```
POST /api/interviews
```
```json
{ "candidate_name": "Jane Smith", "job_role": "Senior Backend Engineer" }
```
Returns `201` with `{ "id": "...", "status": "created", ... }`

---

#### Upload resume
```
POST /api/interviews/{id}/resume
Content-Type: multipart/form-data
file: <PDF or DOCX, max 5MB>
```
Returns `202 Accepted` immediately. Parsing runs asynchronously via Celery.

```json
{ "interview_id": "...", "resume_id": "...", "status": "processing" }
```

---

#### Poll resume parsing status
```
GET /api/interviews/{id}/resume/status
```
Poll until `parsing_status` is `"complete"` or `"failed"`.

```json
{
  "interview_id": "...",
  "parsing_status": "complete",
  "parsed_data": {
    "name": "Jane Smith",
    "current_role": "Backend Engineer",
    "skills": { "programming_languages": ["Python", "Go"], ... },
    ...
  }
}
```

---

#### Generate initial questions
```
GET /api/interviews/{id}/initial-questions
```
Requires resume parsing to be complete. Returns 10–12 questions with interviewer guidance.

```json
[
  {
    "id": "...",
    "question_text": "Walk me through a time you designed a system from scratch...",
    "category": "experience",
    "difficulty": "medium",
    "what_to_listen_for": "Look for structured thinking: requirements gathering, trade-offs, iterative design.",
    "red_flags": "Vague answers with no specifics, or inability to explain why decisions were made.",
    ...
  }
]
```

---

#### Mark a question as asked
```
PATCH /api/interviews/{id}/questions/{question_id}/asked
```

---

#### End interview & trigger evaluation
```
POST /api/interviews/{id}/end
```
Returns `202 Accepted` with an `evaluation_id`. Evaluation runs asynchronously.

```json
{ "interview_id": "...", "evaluation_id": "...", "status": "processing" }
```

---

### Evaluations

#### Poll evaluation status
```
GET /api/evaluations/{evaluation_id}/status
```
Poll until `status` is `"complete"` or `"failed"`.

```json
{
  "id": "...",
  "status": "complete",
  "pdf_url": "https://s3.amazonaws.com/...",
  "total_cost_usd": 0.042,
  "result": {
    "overall_recommendation": "hire",
    "recommendation_reason": "Strong fundamentals across all claimed skills...",
    "skill_matrix": [...],
    "strengths": [...],
    "weaknesses": [...],
    "communication_score": 8,
    "red_flags": [],
    "qa_review": [...],
    "suggested_next_round_focus": [...]
  }
}
```

---

## WebSocket Protocol

Connect at `ws://localhost:8000/ws/interviews/{id}?token=<jwt>`

### Messages sent by client → server

| `type` | Fields | Description |
|--------|--------|-------------|
| `transcript` | `speaker`, `text`, `timestamp` | Stream a transcript chunk |
| `request_suggestions` | — | Request 3 AI-suggested next questions |
| `question_asked` | `question_id` | Mark a question as asked |
| `pong` | — | Response to server heartbeat |

**Transcript chunk example:**
```json
{
  "type": "transcript",
  "speaker": "candidate",
  "text": "I've been working with Kubernetes for about two years...",
  "timestamp": "00:12:34"
}
```

---

### Messages sent by server → client

| `type` | Fields | Description |
|--------|--------|-------------|
| `connected` | `initial_questions`, `transcript_buffered` | Sent on successful connect |
| `transcript_ack` | `sequence` | Confirm transcript chunk received |
| `ping` | — | Heartbeat every 30s |
| `suggestion_start` | — | Streaming is about to begin |
| `suggestion_token` | `content` | Individual streamed token |
| `suggestion_complete` | `suggestions[]` | Final parsed suggestion set |
| `suggestion_error` | `message` | Error during suggestion generation |
| `evaluation_ready` | `evaluation_id`, `pdf_url` | Pushed when async evaluation completes |
| `error` | `message` | General error |

---

### Suggestion flow (streaming)

```
client                          server
  │                               │
  │──── request_suggestions ─────►│
  │                               │── OpenAI stream starts
  │◄─── suggestion_start ─────────│
  │◄─── suggestion_token (×N) ────│   tokens arrive one by one
  │◄─── suggestion_complete ──────│   full structured JSON
```

---

## LLM Usage & Cost

| Step | Model | ~Input tokens | ~Output tokens | ~Cost per interview |
|------|-------|:---:|:---:|:---:|
| Resume parsing | gpt-4o-mini | 2,500 | 1,200 | $0.0011 |
| Initial questions | gpt-4o-mini | 1,800 | 2,500 | $0.0018 |
| Suggestions × 10 | gpt-4o-mini | 3,000 each | 600 each | $0.0081 |
| Rolling summaries × 5 | gpt-4o-mini | 2,500 each | 250 each | $0.0026 |
| Final evaluation | **gpt-4o** | 8,000 | 3,000 | ~$0.050 |
| **Total (45-min interview)** | | | | **~$0.065** |

- Mini is used everywhere except the final evaluation deliverable.
- Token costs tracked per-evaluation in `evaluations.total_cost_usd`.

---

## Background Jobs

### Resume parsing (`parse_resume_task`)
1. Receives file bytes + content type
2. Extracts text via pdfplumber (PDF) or python-docx (DOCX)
3. Falls back to Tesseract OCR if text is empty/garbage
4. Sends raw text to GPT-4o-mini with a structured-output prompt
5. Validates output against `ParsedResume` Pydantic schema
6. Stores in `resumes` table + caches in Redis (TTL 24h)

### Evaluation (`generate_evaluation_task`)
1. Loads full transcript, resume, asked questions from Postgres
2. If transcript > 15k tokens: chunks it and pre-summarises each chunk with gpt-4o-mini
3. Runs final evaluation with GPT-4o using the compressed context
4. Validates output against `EvaluationResult` Pydantic schema
5. Generates branded PDF via WeasyPrint + Jinja2 template
6. Uploads PDF to S3, generates 24h pre-signed URL
7. Persists evaluation record + publishes `evaluation_ready` on Redis pub/sub channel

---

## Database Migrations

```bash
# Generate a new migration after changing models
alembic revision --autogenerate -m "describe your change"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# View migration history
alembic history
```

Tables created:
- `interviews` — interview sessions
- `resumes` — parsed resume data (JSONB)
- `questions` — initial and suggested questions
- `transcripts` — archived transcript entries
- `rolling_summaries` — periodic LLM summaries of interview progress
- `evaluations` — final structured evaluation + PDF metadata

---

## Health Check

```
GET /health
→ { "status": "ok" }
```
