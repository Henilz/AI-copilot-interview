"""Simple JWT auth — username/password demo endpoint.
Replace with your real user store / OAuth provider in production.
"""
from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from pydantic import BaseModel

from app.config import settings
from app.utils.auth import create_access_token, hash_password, verify_password

router = APIRouter()

# Demo in-memory user — replace with DB lookup
_DEMO_USER = {
    "username": "interviewer",
    "hashed_password": hash_password("password123"),
}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/token", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username != _DEMO_USER["username"] or not verify_password(
        form_data.password, _DEMO_USER["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token(
        {"sub": form_data.username},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return TokenResponse(access_token=token)
