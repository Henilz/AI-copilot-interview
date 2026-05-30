from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/interview_copilot"
    SYNC_DATABASE_URL: str = "postgresql+psycopg2://user:password@localhost:5432/interview_copilot"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""
    RESUME_PARSE_MODEL: str = "gpt-4o-mini"
    QUESTION_GENERATION_MODEL: str = "gpt-4o-mini"
    SUGGESTION_MODEL: str = "gpt-4o-mini"
    TRANSCRIPT_SUMMARY_MODEL: str = "gpt-4o-mini"
    EVALUATION_MODEL: str = "gpt-4o"
    # Groq Whisper for tab-audio transcription
    GROQ_API_KEY: str = ""
    GROQ_WHISPER_MODEL: str = "whisper-large-v3-turbo"

    # JWT
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Interviewer credentials (single-user mode)
    INTERVIEWER_USERNAME: str = "interviewer"
    INTERVIEWER_PASSWORD: str = "password123"

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = "interview-copilot-reports"
    AWS_REGION: str = "us-east-1"

    # Local fallback for evaluation PDFs when AWS keys are empty (dev only).
    LOCAL_REPORTS_DIR: str = "/app/data/reports"
    API_PUBLIC_URL: str = "http://localhost:8000"

    # File limits
    MAX_FILE_SIZE_MB: int = 5

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Rate limiting: minimum seconds between suggestion requests
    SUGGESTION_RATE_LIMIT_SECONDS: int = 10

    # Rolling summary: trigger every N exchanges
    ROLLING_SUMMARY_INTERVAL: int = 10

    # Max transcript entries kept in Redis before archiving to Postgres
    REDIS_TRANSCRIPT_MAX: int = 200
    REDIS_TRANSCRIPT_ARCHIVE_BATCH: int = 50

    # Transcript token threshold before chunked summarisation
    TRANSCRIPT_CHUNK_THRESHOLD_TOKENS: int = 15000
    TRANSCRIPT_CHUNK_SIZE_TOKENS: int = 5000

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
