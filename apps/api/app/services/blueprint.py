from __future__ import annotations

from typing import Any
from uuid import uuid4

from app.schemas import ParsedDocument


def _truncate(text: str, limit: int = 260) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 1]}..."


def _source_context(
    *,
    section_heading: str,
    material_excerpt: str,
    graph_node: dict[str, Any],
    target: dict[str, Any],
    why_this_step: str,
) -> dict[str, str]:
    return {
        "section_heading": section_heading,
        "material_excerpt": _truncate(material_excerpt or graph_node.get("detail", "") or target.get("prompt", "")),
        "graph_label": str(graph_node.get("label", "材料结构节点")),
        "graph_detail": _truncate(str(graph_node.get("detail", "等待从材料中补充细节。"))),
        "question_target": str(target.get("prompt", "确认这一段到底需要被理解什么。")),
        "why_this_step": why_this_step,
    }


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
    graph_nodes = learning_representation.get("argument_graph", [])
    chapters: list[dict[str, Any]] = []
    for index, section in enumerate(sections):
        target = question_targets[min(index, len(question_targets) - 1)]
        graph_node = graph_nodes[min(index, len(graph_nodes) - 1)] if graph_nodes else {}
        section_text = _truncate(" ".join(section.paragraphs[:2]), 360)
        section_excerpt = section_text or _truncate(str(graph_node.get("detail", "")), 360)
        distractors = [risk for risk in risks[:3] if risk][:3]
        correct_choice = f"抓住「{target['prompt']}」才算真正理解这一章。"
        choices = [correct_choice, *distractors][:4]
        scene_context = _source_context(
            section_heading=section.heading,
            material_excerpt=section_excerpt,
            graph_node=graph_node,
            target=target,
            why_this_step="先把本章对应的原文和结构节点放到眼前，避免只看空泛引导。",
        )
        explain_context = _source_context(
            section_heading=section.heading,
            material_excerpt=section_excerpt,
            graph_node=graph_node,
            target=target,
            why_this_step="把材料片段压缩成最小讲解，帮助你先抓住可验证的主线。",
        )
        probe_context = _source_context(
            section_heading=section.heading,
            material_excerpt=section_excerpt,
            graph_node=graph_node,
            target=target,
            why_this_step="用问题逼你重建材料逻辑，而不是停在看过一句话的错觉里。",
        )
        challenge_context = _source_context(
            section_heading=section.heading,
            material_excerpt=section_excerpt,
            graph_node=graph_node,
            target=target,
            why_this_step="把本章结构变成可判定的选择动作，检查你是否抓住重点。",
        )
        chapters.append(
            {
                "id": f"chapter-{index + 1}",
                "title": section.heading,
                "theme": ["问题迷雾", "证据回路", "迁移工坊"][index] if len(sections) >= 3 else f"章节 {index + 1}",
                "activities": [
                    _activity(
                        "scene",
                        f"像素场景 {index + 1}",
                        f"先看这段材料：{scene_context['material_excerpt']}",
                        [target["skill_id"]],
                        scene_palette=["#101b2d", "#16425b", "#2f6690", "#f5c65f"][0:4],
                        source_context=scene_context,
                    ),
                    _activity(
                        "explain",
                        f"{section.heading} · 最小讲解",
                        f"这一段最需要抓住的是：{explain_context['graph_label']}。{explain_context['graph_detail']}",
                        [target["skill_id"]],
                        key_points=section.paragraphs[:3],
                        source_context=explain_context,
                    ),
                    _activity(
                        "probe",
                        f"{section.heading} · 理解追问",
                        target["prompt"],
                        [target["skill_id"]],
                        expected_keywords=learning_representation["keywords"][:4],
                        rubric=_rubric_for(target, learning_representation["keywords"]),
                        source_context=probe_context,
                    ),
                    _activity(
                        "challenge",
                        f"{section.heading} · 理解检验",
                        f"围绕「{challenge_context['graph_label']}」做一次判断。不要只凭标题选，要回到上方材料片段和结构节点。",
                        [target["skill_id"]],
                        challenge_type="multiple_choice",
                        choices=choices,
                        correct_index=0,
                        source_context=challenge_context,
                    ),
                ],
            }
        )

    final_target = question_targets[-1]
    final_graph = graph_nodes[-1] if graph_nodes else {}
    final_excerpt = _truncate(" ".join(parsed_document.paragraphs[:3]), 360)
    chapters.append(
        {
            "id": "chapter-final",
            "title": "学习包收束与迁移",
            "theme": "复盘终局",
            "activities": [
                _activity(
                    "reflect",
                    "用自己的话重建这份材料",
                    "请不要做摘要。请说明：核心问题是什么、最关键证据是什么、哪里最容易被误解、你会怎么迁移到别的场景。",
                    [final_target["skill_id"]],
                    expected_keywords=learning_representation["keywords"][:5],
                    source_context=_source_context(
                        section_heading="整份材料",
                        material_excerpt=final_excerpt,
                        graph_node=final_graph,
                        target=final_target,
                        why_this_step="把前面显化过的结构节点重新组织成你自己的理解模型。",
                    ),
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
