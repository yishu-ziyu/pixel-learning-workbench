from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import CourseRun, ReviewPlan, User
from app.schemas import MessageResponse, ReviewPlanItem
from app.services.analytics import record_product_event
from app.services.auth import require_current_user

router = APIRouter(prefix="/review-plans", tags=["reviews"])


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
        items.append(
            ReviewPlanItem(
                id=plan.id,
                course_run_id=plan.course_run_id,
                title=title,
                stage_label=plan.stage_label,
                due_at=plan.due_at,
                status=plan.status,
                guide_message="像素小猫：这次回访不是回忆摘要，而是重建问题、证据和边界。",
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
