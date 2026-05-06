from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models import ProductEvent, User
from app.schemas import ProductEventName


FUNNEL_STEPS: tuple[tuple[ProductEventName, str], ...] = (
    ("first_run_sample_started", "打开示例材料"),
    ("material_parsed", "材料解析完成"),
    ("path_generated", "学习包生成"),
    ("first_activity_completed", "完成首个学习节点"),
    ("d1_review_completed", "完成 D+1 回访"),
)


def record_product_event(
    db: Session,
    user: User,
    event_name: ProductEventName,
    payload: dict[str, Any] | None = None,
    source: str = "api",
) -> ProductEvent:
    event = ProductEvent(
        user_id=user.id,
        event_name=event_name,
        source=source[:40],
        payload=payload or {},
    )
    db.add(event)
    return event
