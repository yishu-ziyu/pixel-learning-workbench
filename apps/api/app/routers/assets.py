from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import LearningAsset, User
from app.schemas import AnalyzeResponse, AssetCreateResponse
from app.services.analysis import build_learning_representation, recommend_intent
from app.services.analytics import record_product_event
from app.services.auth import require_current_user
from app.services.parser import parse_file, parse_plain_text, parse_web_url
from app.services.storage import persist_upload

router = APIRouter(prefix="/assets", tags=["assets"])


@router.post("", response_model=AssetCreateResponse)
def create_asset(
    text: str | None = Form(default=None),
    url: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> AssetCreateResponse:
    source_count = sum(1 for value in (text, url, file) if value)
    if source_count == 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="请上传文件、粘贴文段或输入网页地址。")
    if source_count > 1:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="一次只能提交一种材料来源。")

    if text and len(text.strip()) < 80:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="文本太短，无法构建有效学习包。请补充至少 80 个字符。")

    if file:
        stored_path = persist_upload(file)
        asset = LearningAsset(
            user_id=current_user.id,
            source_type="file",
            original_name=file.filename or stored_path.name,
            content_type=file.content_type or "application/octet-stream",
            stored_path=str(stored_path),
        )
    elif url:
        asset = LearningAsset(
            user_id=current_user.id,
            source_type="url",
            original_name=url.strip(),
            content_type="text/html",
            raw_text=url.strip(),
        )
    else:
        asset = LearningAsset(
            user_id=current_user.id,
            source_type="text",
            original_name="pasted-text",
            content_type="text/plain",
            raw_text=text.strip(),
        )

    db.add(asset)
    db.commit()
    db.refresh(asset)
    return AssetCreateResponse(asset_id=asset.id, source_type=asset.source_type, original_name=asset.original_name)


@router.post("/{asset_id}/analyze", response_model=AnalyzeResponse)
def analyze_asset(
    asset_id: str,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> AnalyzeResponse:
    asset = db.get(LearningAsset, asset_id)
    if not asset or asset.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到该学习材料。")

    if asset.source_type == "url" and asset.raw_text:
        parsed = parse_web_url(asset.raw_text)
    elif asset.raw_text:
        parsed = parse_plain_text(asset.raw_text, source_name=asset.original_name)
    elif asset.stored_path:
        parsed = parse_file(path=Path(asset.stored_path), content_type=asset.content_type)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="材料内容为空。")

    learning_representation = build_learning_representation(parsed)
    recommended_intent = recommend_intent(parsed.doc_type_guess)
    scores = parsed.metadata.get("doc_type_scores", {})
    ordered = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    follow_up_question = None
    if len(ordered) > 1 and abs(ordered[0][1] - ordered[1][1]) < 0.08:
        follow_up_question = "系统对你的材料类型存在轻微歧义。你更想做深度解读、逻辑拆解，还是系统化学习？"

    asset.parse_status = "parsed"
    asset.parsed_document = parsed.model_dump()
    asset.analysis_payload = {
        "recommended_intent": recommended_intent,
        "follow_up_question": follow_up_question,
        "learning_representation": learning_representation,
    }
    db.add(asset)
    record_product_event(
        db,
        current_user,
        "material_parsed",
        {
            "asset_id": asset.id,
            "doc_type": parsed.doc_type_guess,
            "keyword_count": len(learning_representation.get("keywords", [])),
            "question_count": len(learning_representation.get("question_targets", [])),
        },
    )
    db.commit()

    return AnalyzeResponse(
        asset_id=asset.id,
        parsed_document=parsed,
        recommended_intent=recommended_intent,
        doc_type_scores=scores,
        follow_up_question=follow_up_question,
        learning_representation=learning_representation,
    )
