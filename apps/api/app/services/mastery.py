from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime, timedelta
from typing import Any


CONFIDENCE_MULTIPLIER = {"low": 0.5, "medium": 1.0, "high": 1.4}
FACET_MARKERS = {
    "problem": ["问题", "question", "problem"],
    "claim": ["主张", "结论", "claim", "argument"],
    "method": ["方法", "设计", "样本", "method", "experiment", "sample"],
    "evidence": ["证据", "结果", "数据", "evidence", "result", "finding"],
    "counterfactual": ["如果", "反例", "去掉", "counter", "without", "if"],
    "boundary": ["边界", "局限", "不能", "limit", "boundary", "cannot"],
    "transfer": ["迁移", "场景", "应用", "transfer", "apply"],
    "premise": ["前提", "假设", "premise", "assumption"],
    "concept": ["概念", "定义", "concept", "definition"],
    "dependency": ["依赖", "前置", "depends", "prerequisite"],
    "example": ["例子", "例如", "example"],
    "misconception": ["误解", "错误", "容易", "mistake", "misconception"],
}


def build_initial_mastery_state(blueprint: dict[str, Any]) -> dict[str, Any]:
    return {
        "skills": blueprint["skills"],
        "last_result": None,
        "completed_activity_ids": [],
        "review_offsets_days": [1, 3, 7],
    }


def score_free_text(answer_text: str, expected_keywords: list[str], rubric: dict[str, Any] | None = None) -> tuple[bool, float]:
    normalized = answer_text.strip().lower()
    if len(normalized) < 24:
        return False, 0.15
    required_facets = list((rubric or {}).get("required_facets", []))
    hits = sum(1 for keyword in expected_keywords if keyword.lower() in normalized)
    keyword_ratio = hits / max(1, len(expected_keywords)) if expected_keywords else 0.65
    facet_hits = 0
    for facet in required_facets:
        markers = FACET_MARKERS.get(facet, [facet])
        if any(marker.lower() in normalized for marker in markers):
            facet_hits += 1
    facet_ratio = facet_hits / max(1, len(required_facets)) if required_facets else 0.65
    score = round((keyword_ratio * 0.55) + (facet_ratio * 0.45), 3)
    return score >= 0.35 and facet_ratio >= 0.25, score


def evaluate_heuristic_activity(activity: dict[str, Any], answer: dict[str, Any]) -> dict[str, Any]:
    if activity["type"] in {"scene", "explain"}:
        return {"is_correct": True, "score": 1.0, "feedback": "继续向前，把注意力留给真正需要验证的节点。"}
    if activity["type"] == "challenge":
        selected_index = int(answer.get("selected_index", -1))
        correct_index = int(activity.get("correct_index", -1))
        is_correct = selected_index == correct_index
        feedback = "你抓住了本章真正要验证的点。" if is_correct else "你选中了干扰项，这通常意味着你记住了表层内容，但没有抓住验证目标。"
        return {"is_correct": is_correct, "score": 1.0 if is_correct else 0.0, "feedback": feedback}

    answer_text = answer.get("text", "")
    is_correct, score = score_free_text(answer_text, activity.get("expected_keywords", []), activity.get("rubric"))
    if activity["type"] == "reflect":
        feedback = "复盘通过。你已经能主动重建材料逻辑。" if is_correct else "复盘还不够具体。请明确问题、证据、漏洞和迁移边界。"
    else:
        feedback = "这次追问回答得不错。" if is_correct else "回答还停留在表层。请补充关键术语和因果链。"
    return {"is_correct": is_correct, "score": score, "feedback": feedback}


def evaluate_activity(activity: dict[str, Any], answer: dict[str, Any]) -> dict[str, Any]:
    from app.services.model_provider import get_learning_model_provider

    return get_learning_model_provider().evaluate_activity(activity, answer)


def update_mastery_state(mastery_state: dict[str, Any], activity: dict[str, Any], result: dict[str, Any], confidence: str) -> dict[str, Any]:
    next_state = deepcopy(mastery_state)
    multiplier = CONFIDENCE_MULTIPLIER.get(confidence, 1.0)
    delta = (0.14 if result["is_correct"] else -0.08) * multiplier
    timestamp = datetime.now(UTC).isoformat()

    for skill in next_state["skills"]:
        if skill["id"] not in activity.get("skill_ids", []):
            continue
        skill["evidence_count"] += 1
        skill["current_mastery"] = min(1.0, max(0.0, round(skill["current_mastery"] + delta, 3)))
        skill["confidence"] = min(1.0, max(0.0, round(skill["confidence"] + (0.09 if result["is_correct"] else -0.05), 3)))
        skill["last_seen_at"] = timestamp
        if not result["is_correct"]:
            misconceptions = skill.setdefault("misconceptions", [])
            misconceptions.append(result["feedback"])
            skill["misconceptions"] = misconceptions[-3:]

    completed = next_state.setdefault("completed_activity_ids", [])
    if result["is_correct"] or activity["type"] == "reflect":
        if activity["id"] not in completed:
            completed.append(activity["id"])
    next_state["last_result"] = result
    return next_state


def next_activity_index(blueprint: dict[str, Any], current_index: int, result: dict[str, Any], activity: dict[str, Any]) -> int:
    all_activities = [entry for chapter in blueprint["chapters"] for entry in chapter["activities"]]
    if not result["is_correct"] and activity["type"] in {"probe", "challenge"}:
        return current_index
    return min(current_index + 1, len(all_activities))


def guide_message_for_result(result: dict[str, Any], activity: dict[str, Any], completed: bool) -> str:
    if completed:
        return "像素小猫：这轮课程结束了。现在别做摘要，先把逻辑重新说一遍。"
    if result["is_correct"]:
        return "像素小猫：不错，你不是在背答案，而是在抓逻辑。继续前进。"
    if activity["type"] == "challenge":
        return "像素小猫：先别急着选表面看起来最完整的项。想想哪一个最能验证理解。"
    return "像素小猫：把关键问题、证据和边界都说出来，再试一次。"


def build_review_schedule(course_run_id: str) -> list[dict[str, Any]]:
    base = datetime.now(UTC)
    return [
        {"course_run_id": course_run_id, "stage_label": "D+1 回访", "due_at": base + timedelta(days=1)},
        {"course_run_id": course_run_id, "stage_label": "D+3 强化", "due_at": base + timedelta(days=3)},
        {"course_run_id": course_run_id, "stage_label": "D+7 迁移", "due_at": base + timedelta(days=7)},
    ]
