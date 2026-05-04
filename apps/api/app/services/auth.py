from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import MagicLinkToken, User, UserSession


def generate_token(length: int = 24) -> str:
    return secrets.token_urlsafe(length)


def utcnow_naive() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def get_or_create_user(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(email=email, display_name=email.split("@")[0] or "学习者")
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def require_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="缺少登录态，请先通过 magic link 登录。")

    token = authorization.removeprefix("Bearer ").strip()
    session = db.scalar(select(UserSession).where(UserSession.token == token))
    if not session or session.expires_at < utcnow_naive():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登录态已失效，请重新登录。")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在。")
    return user


def issue_magic_link(db: Session, email: str) -> MagicLinkToken:
    token = generate_token()
    entity = MagicLinkToken(
        email=email,
        token=token,
        expires_at=utcnow_naive() + timedelta(minutes=settings.magic_link_ttl_minutes),
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def consume_magic_link(db: Session, token: str) -> UserSession:
    entity = db.scalar(select(MagicLinkToken).where(MagicLinkToken.token == token))
    if not entity or entity.expires_at < utcnow_naive():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="magic link 已过期或不存在。")
    if entity.consumed_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="magic link 已被使用。")
    entity.consumed_at = utcnow_naive()
    user = get_or_create_user(db, entity.email)
    session = UserSession(
        user_id=user.id,
        token=generate_token(),
        expires_at=utcnow_naive() + timedelta(hours=settings.session_ttl_hours),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
