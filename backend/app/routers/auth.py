"""Single-interviewer JWT auth. Credentials are read from .env at startup."""
from datetime import timedelta
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.config import settings
from app.utils.auth import create_access_token, hash_password, verify_password

router = APIRouter()


@lru_cache(maxsize=1)
def _hashed_password() -> str:
    return hash_password(settings.INTERVIEWER_PASSWORD)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/token", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    username_ok = form_data.username == settings.INTERVIEWER_USERNAME
    password_ok = verify_password(form_data.password, _hashed_password())
    if not username_ok or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token(
        {"sub": form_data.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=token)
