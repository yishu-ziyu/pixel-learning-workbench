from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.config import settings


def ensure_storage_dirs() -> None:
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.ocr_dir.mkdir(parents=True, exist_ok=True)


def persist_upload(file: UploadFile) -> Path:
    ensure_storage_dirs()
    suffix = Path(file.filename or "upload.bin").suffix.lower()
    target = settings.uploads_dir / f"{uuid4()}{suffix}"
    with target.open("wb") as handle:
        handle.write(file.file.read())
    return target
