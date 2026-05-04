from __future__ import annotations

import re
from collections import Counter
from typing import Any

from app.schemas import LearningIntent, ParsedDocument

STOPWORDS = {
    "the", "and", "that", "with", "from", "this", "into", "have", "will", "your", "about",
    "研究", "我们", "通过", "以及", "一个", "对于", "可以", "如果", "因为", "因此", "需要",
}


def recommend_intent(doc_type: str) -> LearningIntent:
    if doc_type == "paper":
        return "deep_read"
    if doc_type == "argument_text":
        return "logic_breakdown"
    return "course_learning"


def _top_keywords(parsed_document: ParsedDocument, limit: int = 8) -> list[str]:
    tokens = re.findall(r"[A-Za-z]{4,}|[\u4e00-\u9fff]{2,8}", " ".join(parsed_document.paragraphs))
    frequencies = Counter(token.lower() for token in tokens if token.lower() not in STOPWORDS)
    return [token for token, _ in frequencies.most_common(limit)]


def _sentences(parsed_document: ParsedDocument) -> list[str]:
    text = " ".join(parsed_document.paragraphs)
    chunks = [chunk.strip() for chunk in re.split(r"(?<=[。！？.!?])\s+", text) if chunk.strip()]
    return [chunk[:220] for chunk in chunks if len(chunk) >= 24][:24]


def _first_sentence_matching(parsed_document: ParsedDocument, markers: list[str], fallback: str) -> str:
    candidates = _sentences(parsed_document)
    for sentence in candidates:
        lowered = sentence.lower()
        if any(marker in lowered for marker in markers):
            return sentence
    return candidates[0] if candidates else fallback


def build_heuristic_learning_representation(parsed_document: ParsedDocument) -> dict[str, Any]:
    doc_type = parsed_document.doc_type_guess
    keywords = _top_keywords(parsed_document)
    sections = parsed_document.sections
    first_section = sections[0].paragraphs[0] if sections and sections[0].paragraphs else ""
    concept_map = [
        {
            "id": f"concept-{index + 1}",
            "label": keyword,
            "kind": "concept",
            "depends_on": [keywords[index - 1]] if index > 0 else [],
        }
        for index, keyword in enumerate(keywords[:5])
    ]

    if doc_type == "paper":
        argument_graph = [
            {"id": "research-question", "label": "研究问题", "detail": _first_sentence_matching(parsed_document, ["study", "question", "研究", "探讨"], first_section[:160] or "待从摘要与导言中确认研究问题。"), "kind": "claim"},
            {"id": "method", "label": "方法设计", "detail": _first_sentence_matching(parsed_document, ["method", "experiment", "compare", "sample", "regression", "方法", "实验", "样本"], "优先检查实验设计、样本和变量控制。"), "kind": "evidence"},
            {"id": "evidence", "label": "关键证据", "detail": _first_sentence_matching(parsed_document, ["result", "effect", "improve", "significant", "结果", "发现", "显著"], "优先确认对照差异和统计显著性。"), "kind": "evidence"},
            {"id": "limitation", "label": "局限性", "detail": _first_sentence_matching(parsed_document, ["limit", "depend", "boundary", "discussion", "局限", "依赖", "边界"], "需要主动检查样本偏差、外推边界和未控制变量。"), "kind": "risk"},
        ]
        question_targets = [
            {"id": "q-research", "prompt": "这篇论文真正想解决的核心问题是什么？", "skill_id": "research_question", "rubric_facets": ["problem", "claim"]},
            {"id": "q-method", "prompt": "作者的方法为什么足以支撑结论？哪里可能不够？", "skill_id": "method_design", "rubric_facets": ["method", "evidence"]},
            {"id": "q-evidence", "prompt": "哪些证据最关键？如果去掉它，结论还成立吗？", "skill_id": "evidence_strength", "rubric_facets": ["evidence", "counterfactual"]},
            {"id": "q-transfer", "prompt": "这篇论文的结论能迁移到什么场景，不能迁移到什么场景？", "skill_id": "transfer_boundary", "rubric_facets": ["boundary", "transfer"]},
        ]
        misconception_risks = [
            "把作者的主张误认为定论，而忽略证据强度和局限性。",
            "只记住结论，不理解方法设计与因果链。",
            "将特定样本上的结果过度外推到所有场景。",
        ]
    elif doc_type == "argument_text":
        argument_graph = [
            {"id": "claim", "label": "中心论点", "detail": first_section[:160] or "优先锁定作者真正想说服读者接受的结论。", "kind": "claim"},
            {"id": "premise", "label": "关键前提", "detail": next((paragraph for paragraph in parsed_document.paragraphs if "因为" in paragraph or "because" in paragraph.lower()), "需要主动补出作者隐含的前提条件。"), "kind": "premise"},
            {"id": "evidence", "label": "支持证据", "detail": next((paragraph for paragraph in parsed_document.paragraphs if "例如" in paragraph or "for example" in paragraph.lower()), "寻找案例、数据或权威引用。"), "kind": "evidence"},
            {"id": "counter", "label": "可反驳点", "detail": "主动寻找反例和未说明的边界条件。", "kind": "risk"},
        ]
        question_targets = [
            {"id": "q-claim", "prompt": "如果只能用一句话重述作者的主张，你会怎么说？", "skill_id": "central_claim", "rubric_facets": ["claim"]},
            {"id": "q-premise", "prompt": "作者在论证中依赖了哪些没有明说的前提？", "skill_id": "hidden_premise", "rubric_facets": ["premise", "boundary"]},
            {"id": "q-counter", "prompt": "什么样的反例会动摇这段论证？", "skill_id": "counter_example", "rubric_facets": ["counterfactual"]},
        ]
        misconception_risks = [
            "把论证链条误读成结论本身。",
            "忽略隐含前提，导致表面理解但无法迁移。",
            "把情绪化措辞当成有效证据。",
        ]
    else:
        argument_graph = [
            {"id": "topic", "label": "主题主线", "detail": first_section[:160] or "先识别章节主线与知识递进。", "kind": "claim"},
            {"id": "concepts", "label": "核心概念", "detail": "先掌握定义、例子与概念关系。", "kind": "premise"},
            {"id": "practice", "label": "可练习点", "detail": "从习题、例题和典型错误中确认掌握度。", "kind": "evidence"},
        ]
        question_targets = [
            {"id": "q-concept", "prompt": "哪些概念是后续章节的前置条件？", "skill_id": "prerequisite_concept", "rubric_facets": ["concept", "dependency"]},
            {"id": "q-example", "prompt": "你能用自己的例子解释这个知识点吗？", "skill_id": "self_explanation", "rubric_facets": ["example"]},
            {"id": "q-mistake", "prompt": "学习者最容易在哪一步犯错？", "skill_id": "common_mistake", "rubric_facets": ["misconception"]},
        ]
        misconception_risks = [
            "只记定义，不会举例和应用。",
            "知识点之间没有建立依赖关系。",
            "缺少检验理解的练习动作。",
        ]

    return {
        "argument_graph": argument_graph,
        "concept_map": concept_map,
        "question_targets": question_targets,
        "misconception_risks": misconception_risks,
        "keywords": keywords,
    }


def build_learning_representation(parsed_document: ParsedDocument) -> dict[str, Any]:
    from app.services.model_provider import get_learning_model_provider

    return get_learning_model_provider().build_learning_representation(parsed_document)
