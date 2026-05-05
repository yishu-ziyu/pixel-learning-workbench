from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ProductEvent, User
from app.schemas import ProductEventRequest, ProductEventResponse, ProductFunnelResponse, ProductFunnelStep
from app.services.analytics import FUNNEL_STEPS, record_product_event
from app.services.auth import require_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/events", response_model=ProductEventResponse)
def create_product_event(
    payload: ProductEventRequest,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> ProductEventResponse:
    event = record_product_event(db, current_user, payload.event_name, payload.payload, payload.source)
    db.commit()
    db.refresh(event)
    return ProductEventResponse(id=event.id, event_name=payload.event_name, created_at=event.created_at)


@router.get("/funnel", response_model=ProductFunnelResponse)
def get_product_funnel(
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> ProductFunnelResponse:
    rows = db.execute(
        select(ProductEvent.event_name, func.count(ProductEvent.id))
        .where(ProductEvent.user_id == current_user.id)
        .group_by(ProductEvent.event_name)
    ).all()
    counts = {event_name: count for event_name, count in rows}
    steps = [
        ProductFunnelStep(event_name=event_name, label=label, count=counts.get(event_name, 0), reached=counts.get(event_name, 0) > 0)
        for event_name, label in FUNNEL_STEPS
    ]
    return ProductFunnelResponse(
        steps=steps,
        completed_steps=sum(1 for step in steps if step.reached),
        total_steps=len(steps),
    )
