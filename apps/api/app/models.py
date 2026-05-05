from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def uuid_str() -> str:
    return str(uuid4())


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120), default="学习者")


class MagicLinkToken(Base, TimestampMixin):
    __tablename__ = "magic_link_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    email: Mapped[str] = mapped_column(String(320), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UserSession(Base, TimestampMixin):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    user: Mapped[User] = relationship()


class LearningAsset(Base, TimestampMixin):
    __tablename__ = "learning_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(20))
    original_name: Mapped[str] = mapped_column(String(260))
    content_type: Mapped[str] = mapped_column(String(120))
    stored_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    parse_status: Mapped[str] = mapped_column(String(40), default="pending")
    parsed_document: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    analysis_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    user: Mapped[User] = relationship()


class CourseRun(Base, TimestampMixin):
    __tablename__ = "course_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    asset_id: Mapped[str] = mapped_column(ForeignKey("learning_assets.id"), index=True)
    title: Mapped[str] = mapped_column(String(260))
    intent: Mapped[str] = mapped_column(String(40))
    blueprint: Mapped[dict[str, Any]] = mapped_column(JSON)
    current_activity_index: Mapped[int] = mapped_column(Integer, default=0)
    course_status: Mapped[str] = mapped_column(String(40), default="in_progress")
    mastery_state: Mapped[dict[str, Any]] = mapped_column(JSON)
    latest_guide_message: Mapped[str] = mapped_column(Text, default="像素小猫已经准备好引导你进入课程。")
    user: Mapped[User] = relationship()
    asset: Mapped[LearningAsset] = relationship()


class AssessmentEvent(Base, TimestampMixin):
    __tablename__ = "assessment_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    course_run_id: Mapped[str] = mapped_column(ForeignKey("course_runs.id"), index=True)
    activity_id: Mapped[str] = mapped_column(String(120))
    event_type: Mapped[str] = mapped_column(String(40))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)


class ProductEvent(Base, TimestampMixin):
    __tablename__ = "product_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    event_name: Mapped[str] = mapped_column(String(80), index=True)
    source: Mapped[str] = mapped_column(String(40), default="api")
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    user: Mapped[User] = relationship()


class ReviewPlan(Base, TimestampMixin):
    __tablename__ = "review_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    course_run_id: Mapped[str] = mapped_column(ForeignKey("course_runs.id"), index=True)
    stage_label: Mapped[str] = mapped_column(String(40))
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")
