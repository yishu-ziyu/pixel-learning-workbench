from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User
from app.schemas import MagicLinkRequest, MagicLinkResponse, SessionResponse, UserSummary, VerifyLinkRequest
from app.services.auth import consume_magic_link, issue_magic_link

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-magic-link", response_model=MagicLinkResponse)
def request_magic_link(payload: MagicLinkRequest, db: Session = Depends(get_db)) -> MagicLinkResponse:
    token = issue_magic_link(db, payload.email)
    return MagicLinkResponse(
        email=payload.email,
        preview_token=token.token,
        preview_link=f"http://127.0.0.1:3000/?magic={token.token}",
        expires_at=token.expires_at,
    )


@router.post("/verify", response_model=SessionResponse)
def verify_magic_link(payload: VerifyLinkRequest, db: Session = Depends(get_db)) -> SessionResponse:
    session = consume_magic_link(db, payload.token)
    user = db.get(User, session.user_id)
    assert user is not None
    return SessionResponse(
        session_token=session.token,
        user=UserSummary(id=user.id, email=user.email, display_name=user.display_name),
    )
