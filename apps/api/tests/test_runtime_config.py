from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.routers.auth import build_magic_preview_link


def test_cors_allows_loopback_dev_ports() -> None:
    client = TestClient(app)

    response = client.options(
        "/api/auth/request-magic-link",
        headers={
            "Origin": "http://127.0.0.1:3011",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3011"


def test_magic_preview_link_uses_configured_frontend_base_url() -> None:
    original_frontend_base_url = settings.frontend_base_url
    settings.frontend_base_url = "http://127.0.0.1:3011/"
    try:
        assert build_magic_preview_link("dev-token") == "http://127.0.0.1:3011/?magic=dev-token"
    finally:
        settings.frontend_base_url = original_frontend_base_url
