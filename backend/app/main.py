from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, AsyncSessionLocal
from app.models import Base
from app.redis_client import get_redis
from app.routers import auth, evaluations, interviews, websocket
from app.routers import audio, auth, evaluations, interviews, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Interview Copilot",
    version="1.0.0",
    description="Backend API for AI-assisted technical interviews",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(interviews.router, prefix="/api", tags=["interviews"])
app.include_router(evaluations.router, prefix="/api", tags=["evaluations"])
app.include_router(websocket.router, tags=["websocket"])
app.include_router(audio.router, tags=["audio"])


@app.get("/health")
async def health_check():
    checks = {}

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    try:
        r = get_redis()
        await r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    all_ok = all(v == "ok" for v in checks.values())
    return {"status": "ok" if all_ok else "degraded", **checks}
