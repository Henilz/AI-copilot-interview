# Running the backend with Docker Compose (Windows)

This guide captures the exact steps — and the fixes we had to apply — to get the AI Interview Copilot backend running locally on Windows via Docker Compose.

---

## Prerequisites

- **Docker Desktop** for Windows (with WSL2 backend). Verify:
  ```powershell
  docker --version
  docker-compose --version
  ```
- **Git** (the repo is already cloned if you're reading this).
- **(Optional)** pgAdmin or another Postgres client if you want to inspect the database visually.

You do **not** need Python installed locally — everything runs in containers.

---

## Step 1 — Create the `.env` file

The repo ships `.env.example`. Copy it to `.env` inside `backend/` and update the host names so containers can reach each other.

`backend/.env`:

```env
# Database — note hostnames are container names, not localhost
DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/interview_copilot
SYNC_DATABASE_URL=postgresql+psycopg2://user:password@postgres:5432/interview_copilot

# Redis
REDIS_URL=redis://redis:6379/0

# OpenAI — replace with a real key before exercising LLM endpoints
OPENAI_API_KEY=sk-...

# JWT
SECRET_KEY=change-me-in-production-use-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AWS S3 (optional — only needed for PDF report uploads)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=interview-copilot-reports
AWS_REGION=us-east-1

MAX_FILE_SIZE_MB=5

# Celery
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2
```

> **Important:** use `postgres` and `redis` as the hostnames in `DATABASE_URL` / `REDIS_URL`, not `localhost`. Inside the Docker network, services reach each other by service name.

The placeholder `OPENAI_API_KEY=sk-...` lets the server boot; replace it with a real key before testing resume parsing, question generation, suggestions, or evaluation.

---

## Step 2 — Fixes applied to the repo

Three small fixes were needed to make the project build and run on a clean Docker Desktop / Windows setup.

### 2a. `Dockerfile` — package rename in Debian trixie

The base image `python:3.12-slim` now uses Debian trixie, which renamed `libgdk-pixbuf2.0-0` → `libgdk-pixbuf-2.0-0` (added hyphen).

`backend/Dockerfile`:

```diff
- libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf2.0-0 \
+ libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
```

### 2b. `requirements.txt` — pin bcrypt

`passlib`'s startup self-check crashes on `bcrypt >= 4.1` with:

```
ValueError: password cannot be longer than 72 bytes, truncate manually if necessary
```

Pin bcrypt below 4.1:

`backend/requirements.txt`:

```diff
  passlib[bcrypt]>=1.7.4
+ bcrypt<4.1
```

### 2c. `docker-compose.yml` — remap Postgres host port

If you already have a local PostgreSQL installed on Windows (port 5432), Docker Desktop **silently fails** to forward the port — pgAdmin/psql from the host will connect to the local install instead of Docker. Move the host-side mapping to 5433:

`backend/docker-compose.yml`:

```diff
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: interview_copilot
    ports:
-     - "5432:5432"
+     - "5433:5432"
```

> Only the **host-side** port changed. Inside the Docker network, services still talk to `postgres:5432`. So `DATABASE_URL` in `.env` does **not** change.

If you don't have a local Postgres conflict, you can keep `"5432:5432"` — but using 5433 is safer regardless.

---

## Step 3 — Build and start the stack

From `backend/`:

```powershell
docker-compose up --build
```

First build takes a few minutes (downloads `python:3.12-slim`, installs WeasyPrint / Tesseract / Poppler system libs, then pip-installs ~30 Python packages).

Subsequent starts are fast:

```powershell
docker-compose up           # foreground
docker-compose up -d        # background (detached)
```

What you should see in the logs:

```
api-1           | INFO:     Uvicorn running on http://0.0.0.0:8000
celery_worker-1 | celery@<hash> ready.
postgres-1      | database system is ready to accept connections
redis-1         | Ready to accept connections tcp
```

---

## Step 4 — Verify it's running

### API health check

```powershell
curl http://localhost:8000/health
# → {"status":"ok"}
```

### Swagger / OpenAPI docs

Open in a browser: **http://localhost:8000/docs**

### Database tables

Tables are auto-created by FastAPI's lifespan hook in [app/main.py](app/main.py) via `Base.metadata.create_all`, so no `alembic upgrade head` is needed in dev.

Verify from the command line:

```powershell
docker-compose exec postgres psql -U user -d interview_copilot -c "\dt"
```

Expected output:

```
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+-------
 public | evaluations       | table | user
 public | interviews        | table | user
 public | questions         | table | user
 public | resumes           | table | user
 public | rolling_summaries | table | user
 public | transcripts       | table | user
```

### Container status

```powershell
docker-compose ps
```

---

## Step 5 — Connect pgAdmin (optional)

Register a new server in pgAdmin with these exact values:

| Field | Value |
|---|---|
| Name | `Interview Copilot (Docker)` |
| Host name/address | `localhost` |
| Port | **`5433`** (not 5432 — see fix 2c) |
| Maintenance database | `postgres` |
| Username | `user` |
| Password | `password` |

After saving, expand the tree to find the tables:

```
Servers
└─ Interview Copilot (Docker)
   └─ Databases
      └─ interview_copilot          ← NOT the "postgres" DB
         └─ Schemas
            └─ public
               └─ Tables             ← all 6 tables here
```

Common pitfall: stopping at the database level. pgAdmin nests tables under **Schemas → public → Tables**.

---

## Daily commands

| Command | What it does |
|---|---|
| `docker-compose up -d` | Start everything in the background |
| `docker-compose down` | Stop and remove containers (volumes preserved) |
| `docker-compose down -v` | Stop and **wipe the database volume** (destructive) |
| `docker-compose logs -f api` | Tail the API logs |
| `docker-compose logs -f celery_worker` | Tail the Celery worker logs |
| `docker-compose restart api` | Restart just the API container (e.g., after editing `.env`) |
| `docker-compose exec api bash` | Open a shell inside the API container |
| `docker-compose exec postgres psql -U user -d interview_copilot` | Open a psql shell |

---

## Troubleshooting

### "FATAL: password authentication failed for user 'user'"
You're connecting to the **wrong Postgres**. If you have a local Windows install on 5432, pgAdmin/psql from the host will hit *that* one, not Docker. Use host port **5433** instead (after fix 2c).

### "Package 'libgdk-pixbuf2.0-0' has no installation candidate" during build
Apply fix 2a (rename to `libgdk-pixbuf-2.0-0`).

### `api-1` container exits with `ValueError: password cannot be longer than 72 bytes`
Apply fix 2b (pin `bcrypt<4.1`).

### API can't reach Postgres / Redis
Check that `DATABASE_URL` and `REDIS_URL` in `.env` use the service names (`postgres`, `redis`) — not `localhost`. From inside a container, `localhost` means the container itself.

### Port already in use
Something else on your machine is using 8000, 5433, or 6379. Either stop that process or change the host-side port in `docker-compose.yml`.

### Tables don't appear after restart
The named volume `postgres_data` persists data across restarts. Tables are created the first time the API starts (lifespan hook). If you ran `docker-compose down -v`, the volume was wiped — bring the stack up again and the API will recreate tables on first boot.

---

## Ports reference

| Service | Host port | Container port | Purpose |
|---|---|---|---|
| API | 8000 | 8000 | FastAPI / Uvicorn |
| Postgres | **5433** | 5432 | Database |
| Redis | 6379 | 6379 | Cache + Celery broker |
| Celery worker | — | — | Internal only |

---

## Next steps

- Replace `OPENAI_API_KEY` in `.env` with a real key, then `docker-compose restart api celery_worker`.
- Hit `http://localhost:8000/docs` and try `POST /api/auth/token` with `username=interviewer`, `password=password123` to get a JWT.
- See the main [README.md](README.md) for the full API reference and WebSocket protocol.
