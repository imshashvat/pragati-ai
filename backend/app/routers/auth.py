"""app/routers/auth.py — POST /auth/login, POST /auth/logout"""

from fastapi import APIRouter, Depends, HTTPException, status
import bcrypt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import create_access_token, get_current_user
from app.models.ingestion_log import User

router = APIRouter(prefix="/auth", tags=["auth"])


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    user_id: str


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not _verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token({"sub": user.user_id, "role": user.role})
    return LoginResponse(token=token, role=user.role, user_id=user.user_id)


@router.post("/logout")
def logout(user: User = Depends(get_current_user)):
    # Stateless JWT — client simply discards the token
    return {"message": "logged out"}
