from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AssessmentEvent, CourseRun, ReviewPlan, User
from app.schemas import MessageResponse, ReviewPlanItem
from app.services.analytics import record_product_event
from app.services.auth import require_current_user

router = APIRouter(prefix="/review-plans", tags=["reviews"])


def build_review_reasons(course_run: CourseRun | None, db: Session) -> list[str]:
    if not course_run:
        return ["这条复习计划还没有找到对应学习包，请先回到历史学习包确认。"]

    mastery_state = course_run.mastery_state or {}
    skills = list(mastery_state.get("skills", []))
    reasons: list[str] = []

    events = db.scalars(
        select(AssessmentEvent).where(AssessmentEvent.course_run_id == course_run.id).order_by(AssessmentEvent.created_at.desc())
    ).all()
    incorrect_feedback = []
    low_confidence_count = 0
    for event in events:
        payload = event.payload or {}
        result = payload.get("result") if isinstance(payload.get("result"), dict) else {}
        if payload.get("confidence") == "low":
            low_confidence_count += 1
        if result and result.get("is_correct") is False and result.get("feedback"):
            incorrect_feedback.append(str(result["feedback"]))

    if incorrect_feedback:
        reasons.append(f"错题反馈：{incorrect_feedback[0]}")
    if low_confidence_count:
        reasons.append(f"低把握记录：你有 {low_confidence_count} 次把握度选择为 low，本轮先回访这些不稳定点。")

    weak_skills = sorted(
        skills,
        key=lambda skill: (float(skill.get("current_mastery", 1)), float(skill.get("confidence", 1))),
    )
    for skill in weak_skills[:2]:
        mastery = float(skill.get("current_mastery", 0))
        confidence = float(skill.get("confidence", 0))
        misconceptions = skill.get("misconceptions") or []
        if mastery < 0.5 or confidence < 0.4 or misconceptions:
            label = skill.get("label") or skill.get("id") or "未命名概念"
            reasons.append(f"弱概念：{label}，当前掌握度 {round(mastery * 100)}%。")
            if misconceptions:
                reasons.append(f"误解线索：{misconceptions[-1]}")

    if not reasons and weak_skills:
        label = weak_skills[0].get("label") or weak_skills[0].get("id") or "关键概念"
        reasons.append(f"巩固目标：先重建 {label} 的问题、证据和边界。")

    return list(dict.fromkeys(reasons))[:4]


@router.get("", response_model=list[ReviewPlanItem])
def list_review_plans(
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> list[ReviewPlanItem]:
    rows = db.scalars(select(ReviewPlan).where(ReviewPlan.user_id == current_user.id).order_by(ReviewPlan.due_at.asc())).all()
    items: list[ReviewPlanItem] = []
    for plan in rows:
        course_run = db.get(CourseRun, plan.course_run_id)
        title = course_run.title if course_run else "未知课程"
        review_reasons = build_review_reasons(course_run, db)
        items.append(
            ReviewPlanItem(
                id=plan.id,
                course_run_id=plan.course_run_id,
                title=title,
                stage_label=plan.stage_label,
                due_at=plan.due_at,
                status=plan.status,
                guide_message="像素小猫：这次回访不是回忆摘要，而是针对错题、低把握和弱概念重建证据链。",
                review_reasons=review_reasons,
            )
        )
    return items


@router.post("/{review_plan_id}/complete", response_model=MessageResponse)
def complete_review_plan(
    review_plan_id: str,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    plan = db.get(ReviewPlan, review_plan_id)
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到复习计划。")
    plan.status = "completed"
    plan.completed_at = datetime.now(UTC)
    db.add(plan)
    if plan.stage_label.startswith("D+1"):
        record_product_event(
            db,
            current_user,
            "d1_review_completed",
            {
                "course_run_id": plan.course_run_id,
                "review_plan_id": plan.id,
                "stage_label": plan.stage_label,
            },
        )
    db.commit()
    return MessageResponse(message="复习计划已完成。")
