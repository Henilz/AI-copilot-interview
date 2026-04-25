from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import Base
from app.routers import auth, evaluations, interviews, websocket


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


@app.get("/health")
async def health_check():
    return {"status": "ok"}
