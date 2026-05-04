from __future__ import annotations

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db import Base, get_db
from app.main import app


def test_text_to_review_plan_flow(tmp_path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'smoke.sqlite3'}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app)
        text = """
        Abstract
        This paper studies how interactive learning improves deep reading for complex research material.
        Introduction
        Learners often remember conclusions without understanding the evidence chain.
        Methods
        We compare passive reading with guided challenges, probes, and reflection activities.
        Results
        The guided challenge condition improves transfer, explanation quality, and delayed recall.
        Discussion
        The effect depends on turning claims and evidence into actions rather than summaries.
        """

        magic_response = client.post("/api/auth/request-magic-link", json={"email": "learner@example.com"})
        assert magic_response.status_code == 200
        preview_token = magic_response.json()["preview_token"]

        session_response = client.post("/api/auth/verify", json={"token": preview_token})
        assert session_response.status_code == 200
        headers = {"Authorization": f"Bearer {session_response.json()['session_token']}"}

        asset_response = client.post("/api/assets", data={"text": text}, headers=headers)
        assert asset_response.status_code == 200
        asset_id = asset_response.json()["asset_id"]

        analyze_response = client.post(f"/api/assets/{asset_id}/analyze", headers=headers)
        assert analyze_response.status_code == 200
        analyzed = analyze_response.json()
        assert analyzed["recommended_intent"] == "deep_read"
        assert analyzed["parsed_document"]["doc_type_guess"] == "paper"

        blueprint_response = client.post(f"/api/assets/{asset_id}/course-blueprint?intent=deep_read", headers=headers)
        assert blueprint_response.status_code == 200
        blueprint = blueprint_response.json()["blueprint"]
        assert blueprint["cover"]["activity_count"] >= 5

        run_response = client.post(
            "/api/course-runs",
            json={"asset_id": asset_id, "intent": "deep_read", "blueprint": blueprint},
            headers=headers,
        )
        assert run_response.status_code == 200
        run = run_response.json()

        first_activity = blueprint["chapters"][0]["activities"][0]
        event_response = client.post(
            f"/api/course-runs/{run['id']}/events",
            json={
                "activity_id": first_activity["id"],
                "activity_type": first_activity["type"],
                "answer": {},
                "confidence": "medium",
                "duration_seconds": 30,
            },
            headers=headers,
        )
        assert event_response.status_code == 200
        assert event_response.json()["course_run"]["current_activity_index"] == 1

        review_response = client.get("/api/review-plans", headers=headers)
        assert review_response.status_code == 200
        reviews = review_response.json()
        assert [item["stage_label"] for item in reviews] == ["D+1 回访", "D+3 强化", "D+7 迁移"]
    finally:
        app.dependency_overrides.clear()
