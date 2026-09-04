"""
app/deps.py
───────────
FastAPI dependencies for JWT authentication and role-based access control.

Roles (Section 2):
    "officer"         — view projects, acknowledge/act on alerts, add review notes
    "senior_official" — read-only views; cannot POST /alerts/{id}/review
    "admin"           — /admin/* endpoints only

Usage in routers:
    current_user = Depends(get_current_user)
    _             = Depends(require_role("officer", "admin"))
"""

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.ingestion_log import User

bearer_scheme = HTTPBearer()


# ── Token creation ────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = expire
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ── Current user dependency ───────────────────────────────────────────────────

def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


# ── Role-based access ─────────────────────────────────────────────────────────

def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that raises 403 if the current user's
    role is not in allowed_roles.

    Example:
        @router.post("/admin/ingest")
        def ingest(user=Depends(require_role("admin"))):
            ...
    """
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted for this action.",
            )
        return user
    return _check
