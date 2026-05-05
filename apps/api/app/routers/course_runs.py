from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AssessmentEvent, CourseRun, LearningAsset, ReviewPlan, User
from app.schemas import (
    AssessmentEventRequest,
    AssessmentEventResponse,
    CourseBlueprintResponse,
    CourseRunCreateRequest,
    CourseRunResponse,
    CourseRunSummary,
    ParsedDocument,
)
from app.services.analytics import record_product_event
from app.services.auth import require_current_user
from app.services.blueprint import build_course_blueprint
from app.services.mastery import (
    build_initial_mastery_state,
    build_review_schedule,
    evaluate_activity,
    guide_message_for_result,
    next_activity_index,
    update_mastery_state,
)

router = APIRouter(prefix="", tags=["courses"])


def flatten_activities(blueprint: dict) -> list[dict]:
    return [activity for chapter in blueprint["chapters"] for activity in chapter["activities"]]


@router.post("/assets/{asset_id}/course-blueprint", response_model=CourseBlueprintResponse)
def create_blueprint(
    asset_id: str,
    intent: str,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> CourseBlueprintResponse:
    asset = db.get(LearningAsset, asset_id)
    if not asset or asset.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到该学习材料。")
    if not asset.parsed_document or not asset.analysis_payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请先完成材料分析。")

    blueprint = build_course_blueprint(
        parsed_document=ParsedDocument.model_validate(asset.parsed_document),
        learning_representation=asset.analysis_payload["learning_representation"],
        intent=intent,
    )
    return CourseBlueprintResponse(asset_id=asset_id, intent=intent, blueprint=blueprint)


@router.post("/course-runs", response_model=CourseRunResponse)
def create_course_run(
    payload: CourseRunCreateRequest,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> CourseRunResponse:
    asset = db.get(LearningAsset, payload.asset_id)
    if not asset or asset.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到学习材料。")

    mastery_state = build_initial_mastery_state(payload.blueprint)
    course_run = CourseRun(
        user_id=current_user.id,
        asset_id=payload.asset_id,
        title=payload.blueprint["title"],
        intent=payload.intent,
        blueprint=payload.blueprint,
        mastery_state=mastery_state,
        current_activity_index=0,
        latest_guide_message="像素小猫：先别急着浏览结论，我们从最该被验证的问题开始。",
    )
    db.add(course_run)
    db.commit()
    db.refresh(course_run)
    record_product_event(
        db,
        current_user,
        "path_generated",
        {
            "asset_id": payload.asset_id,
            "course_run_id": course_run.id,
            "intent": payload.intent,
            "activity_count": payload.blueprint["cover"]["activity_count"],
            "chapter_count": payload.blueprint["cover"]["chapter_count"],
        },
    )

    for schedule in build_review_schedule(course_run.id):
        db.add(
            ReviewPlan(
                user_id=current_user.id,
                course_run_id=course_run.id,
                stage_label=schedule["stage_label"],
                due_at=schedule["due_at"],
                status="scheduled",
            )
        )
    db.commit()

    return CourseRunResponse(
        id=course_run.id,
        asset_id=course_run.asset_id,
        title=course_run.title,
        intent=course_run.intent,
        blueprint=course_run.blueprint,
        current_activity_index=course_run.current_activity_index,
        course_status=course_run.course_status,
        mastery_state=course_run.mastery_state,
        latest_guide_message=course_run.latest_guide_message,
    )


@router.get("/course-runs", response_model=list[CourseRunSummary])
def list_course_runs(
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> list[CourseRunSummary]:
    runs = db.scalars(select(CourseRun).where(CourseRun.user_id == current_user.id).order_by(CourseRun.updated_at.desc())).all()
    return [
        CourseRunSummary(
            id=run.id,
            title=run.title,
            intent=run.intent,
            course_status=run.course_status,
            current_activity_index=run.current_activity_index,
            updated_at=run.updated_at,
        )
        for run in runs
    ]


@router.get("/course-runs/{course_run_id}", response_model=CourseRunResponse)
def get_course_run(
    course_run_id: str,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> CourseRunResponse:
    run = db.get(CourseRun, course_run_id)
    if not run or run.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到课程。")
    return CourseRunResponse(
        id=run.id,
        asset_id=run.asset_id,
        title=run.title,
        intent=run.intent,
        blueprint=run.blueprint,
        current_activity_index=run.current_activity_index,
        course_status=run.course_status,
        mastery_state=run.mastery_state,
        latest_guide_message=run.latest_guide_message,
    )


@router.post("/course-runs/{course_run_id}/events", response_model=AssessmentEventResponse)
def record_event(
    course_run_id: str,
    payload: AssessmentEventRequest,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> AssessmentEventResponse:
    run = db.get(CourseRun, course_run_id)
    if not run or run.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到课程。")

    activities = flatten_activities(run.blueprint)
    current_index = run.current_activity_index
    current_activity = next((activity for activity in activities if activity["id"] == payload.activity_id), None)
    if not current_activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到活动节点。")

    result = evaluate_activity(current_activity, payload.answer)
    run.mastery_state = update_mastery_state(run.mastery_state, current_activity, result, payload.confidence)
    next_index = next_activity_index(run.blueprint, current_index, result, current_activity)
    completed = next_index >= len(activities)
    run.current_activity_index = next_index
    run.course_status = "completed" if completed else "in_progress"
    run.latest_guide_message = guide_message_for_result(result, current_activity, completed)

    event = AssessmentEvent(
        user_id=current_user.id,
        course_run_id=run.id,
        activity_id=payload.activity_id,
        event_type=payload.activity_type,
        payload=payload.model_dump() | {"result": result},
    )
    db.add(event)
    db.add(run)
    if current_index == 0 and next_index > 0:
        record_product_event(
            db,
            current_user,
            "first_activity_completed",
            {
                "course_run_id": run.id,
                "activity_id": payload.activity_id,
                "activity_type": payload.activity_type,
                "score": result.get("score"),
                "is_correct": result.get("is_correct"),
            },
        )
    db.commit()
    db.refresh(run)

    response_run = CourseRunResponse(
        id=run.id,
        asset_id=run.asset_id,
        title=run.title,
        intent=run.intent,
        blueprint=run.blueprint,
        current_activity_index=run.current_activity_index,
        course_status=run.course_status,
        mastery_state=run.mastery_state,
        latest_guide_message=run.latest_guide_message,
    )
    return AssessmentEventResponse(message="学习事件已记录。", result=result, course_run=response_run)
