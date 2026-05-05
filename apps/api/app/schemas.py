from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


DocType = Literal["paper", "argument_text", "notes_or_textbook"]
LearningIntent = Literal["deep_read", "logic_breakdown", "course_learning"]
ActivityType = Literal["scene", "explain", "probe", "challenge", "reflect"]
ProductEventName = Literal[
    "first_run_sample_started",
    "material_parsed",
    "path_generated",
    "first_activity_completed",
    "d1_review_completed",
]


class MessageResponse(BaseModel):
    message: str


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkResponse(BaseModel):
    email: EmailStr
    preview_token: str
    preview_link: str
    expires_at: datetime


class VerifyLinkRequest(BaseModel):
    token: str


class UserSummary(BaseModel):
    id: str
    email: str
    display_name: str


class SessionResponse(BaseModel):
    session_token: str
    user: UserSummary


class AssetCreateResponse(BaseModel):
    asset_id: str
    source_type: str
    original_name: str


class ParsedSection(BaseModel):
    heading: str
    paragraphs: list[str]


class ParsedDocument(BaseModel):
    metadata: dict[str, Any]
    sections: list[ParsedSection]
    paragraphs: list[str]
    citations: list[str]
    tables: list[str]
    formulas: list[str]
    language: str
    doc_type_guess: DocType
    parse_strategy: str


class AnalyzeResponse(BaseModel):
    asset_id: str
    parsed_document: ParsedDocument
    recommended_intent: LearningIntent
    doc_type_scores: dict[str, float]
    follow_up_question: str | None = None
    learning_representation: dict[str, Any]


class CourseBlueprintResponse(BaseModel):
    asset_id: str
    intent: LearningIntent
    blueprint: dict[str, Any]


class CourseRunCreateRequest(BaseModel):
    asset_id: str
    intent: LearningIntent
    blueprint: dict[str, Any]


class CourseRunSummary(BaseModel):
    id: str
    title: str
    intent: LearningIntent
    course_status: str
    current_activity_index: int
    updated_at: datetime


class CourseRunResponse(BaseModel):
    id: str
    asset_id: str
    title: str
    intent: LearningIntent
    blueprint: dict[str, Any]
    current_activity_index: int
    course_status: str
    mastery_state: dict[str, Any]
    latest_guide_message: str


class AssessmentEventRequest(BaseModel):
    activity_id: str
    activity_type: ActivityType
    answer: dict[str, Any] = Field(default_factory=dict)
    confidence: Literal["low", "medium", "high"] = "medium"
    duration_seconds: int = 0


class AssessmentEventResponse(BaseModel):
    message: str
    result: dict[str, Any]
    course_run: CourseRunResponse


class ReviewPlanItem(BaseModel):
    id: str
    course_run_id: str
    title: str
    stage_label: str
    due_at: datetime
    status: str
    guide_message: str


class ProductEventRequest(BaseModel):
    event_name: ProductEventName
    source: str = "web"
    payload: dict[str, Any] = Field(default_factory=dict)


class ProductEventResponse(BaseModel):
    id: str
    event_name: ProductEventName
    created_at: datetime


class ProductFunnelStep(BaseModel):
    event_name: ProductEventName
    label: str
    count: int
    reached: bool


class ProductFunnelResponse(BaseModel):
    steps: list[ProductFunnelStep]
    completed_steps: int
    total_steps: int
