from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.schemas import ParsedDocument


def _activity(
    activity_type: str,
    title: str,
    body: str,
    skill_ids: list[str],
    **extra: Any,
) -> dict[str, Any]:
    payload = {
        "id": f"{activity_type}-{uuid4().hex[:8]}",
        "type": activity_type,
        "title": title,
        "body": body,
        "skill_ids": skill_ids,
    }
    payload.update(extra)
    return payload


def _rubric_for(target: dict[str, Any], keywords: list[str]) -> dict[str, Any]:
    return {
        "required_facets": target.get("rubric_facets", []),
        "expected_keywords": keywords[:4],
        "passing_note": "回答需要覆盖验证目标，而不是只复述材料表层结论。",
    }


def build_heuristic_course_blueprint(parsed_document: ParsedDocument, learning_representation: dict[str, Any], intent: str) -> dict[str, Any]:
    title = parsed_document.metadata.get("title") or "未命名学习材料"
    question_targets = learning_representation["question_targets"]
    risks = learning_representation["misconception_risks"]
    skills = [
        {
            "id": target["skill_id"],
            "label": target["prompt"],
            "current_mastery": 0.35,
            "confidence": 0.25,
            "evidence_count": 0,
            "last_seen_at": None,
            "review_due_at": None,
            "misconceptions": [],
        }
        for target in question_targets
    ]

    sections = parsed_document.sections[:3]
    chapters: list[dict[str, Any]] = []
    for index, section in enumerate(sections):
        target = question_targets[min(index, len(question_targets) - 1)]
        section_text = " ".join(section.paragraphs[:2])[:220]
        distractors = [risk for risk in risks[:3] if risk][:3]
        correct_choice = f"抓住「{target['prompt']}」才算真正理解这一章。"
        choices = [correct_choice, *distractors][:4]
        chapters.append(
            {
                "id": f"chapter-{index + 1}",
                "title": section.heading,
                "theme": ["问题迷雾", "证据回路", "迁移工坊"][index] if len(sections) >= 3 else f"章节 {index + 1}",
                "activities": [
                    _activity(
                        "scene",
                        f"像素场景 {index + 1}",
                        f"你进入「{section.heading}」场景。当前目标不是复述内容，而是识别必须被验证的逻辑节点。",
                        [target["skill_id"]],
                        scene_palette=["#101b2d", "#16425b", "#2f6690", "#f5c65f"][0:4],
                    ),
                    _activity(
                        "explain",
                        f"{section.heading} · 最小讲解",
                        section_text or "系统将当前章节重写成最小必要讲解块，避免冗长总结。",
                        [target["skill_id"]],
                        key_points=section.paragraphs[:3],
                    ),
                    _activity(
                        "probe",
                        f"{section.heading} · 理解追问",
                        target["prompt"],
                        [target["skill_id"]],
                        expected_keywords=learning_representation["keywords"][:4],
                        rubric=_rubric_for(target, learning_representation["keywords"]),
                    ),
                    _activity(
                        "challenge",
                        f"{section.heading} · 理解检验",
                        "选择最能体现本章学习重点的一项。如果只是记住结论而没抓住逻辑，这里会暴露出来。",
                        [target["skill_id"]],
                        challenge_type="multiple_choice",
                        choices=choices,
                        correct_index=0,
                    ),
                ],
            }
        )

    final_target = question_targets[-1]
    chapters.append(
        {
            "id": "chapter-final",
            "title": "课程收束与迁移",
            "theme": "复盘终局",
            "activities": [
                _activity(
                    "reflect",
                    "用自己的话重建这份材料",
                    "请不要做摘要。请说明：核心问题是什么、最关键证据是什么、哪里最容易被误解、你会怎么迁移到别的场景。",
                    [final_target["skill_id"]],
                    expected_keywords=learning_representation["keywords"][:5],
                    rubric={
                        "required_facets": ["problem", "evidence", "boundary", "transfer"],
                        "expected_keywords": learning_representation["keywords"][:5],
                        "passing_note": "复盘必须重建问题、证据、误解风险和迁移边界。",
                    },
                )
            ],
        }
    )

    all_activities = [activity for chapter in chapters for activity in chapter["activities"]]
    return {
        "title": title,
        "doc_type": parsed_document.doc_type_guess,
        "intent": intent,
        "cover": {
            "hook": "把材料变成一段可玩的理解旅程，而不是另一份总结。",
            "estimated_minutes": max(8, len(all_activities) * 2),
            "chapter_count": len(chapters),
            "activity_count": len(all_activities),
            "language": parsed_document.language,
        },
        "chapters": chapters,
        "skills": skills,
        "guide_character": {
            "name": "像素小猫",
            "role": "学习引导角色",
            "stance": "鼓励 + 追问",
        },
        "learning_representation": learning_representation,
    }


def build_course_blueprint(parsed_document: ParsedDocument, learning_representation: dict[str, Any], intent: str) -> dict[str, Any]:
    from app.services.model_provider import get_learning_model_provider

    return get_learning_model_provider().build_course_blueprint(parsed_document, learning_representation, intent)
