from app.services.analysis import build_learning_representation, recommend_intent
from app.services.blueprint import build_course_blueprint
from app.services.mastery import evaluate_activity, update_mastery_state
from app.services.parser import parse_plain_text


def test_parser_detects_paper_and_recommend_intent() -> None:
    text = """
    Abstract
    This paper studies retrieval-augmented tutoring systems.
    Introduction
    We compare two methods and report the results.
    Methods
    We run an experiment with 120 learners.
    Results
    The intervention improves retention.
    Conclusion
    The method transfers to adjacent domains.
    """
    parsed = parse_plain_text(text, source_name="paper.txt")
    assert parsed.doc_type_guess == "paper"
    assert recommend_intent(parsed.doc_type_guess) == "deep_read"


def test_blueprint_contains_reflect_activity() -> None:
    parsed = parse_plain_text("因为论证需要前提，所以我们需要识别隐含条件。", source_name="argument.txt")
    representation = build_learning_representation(parsed)
    blueprint = build_course_blueprint(parsed, representation, "logic_breakdown")
    activities = [activity for chapter in blueprint["chapters"] for activity in chapter["activities"]]
    assert any(activity["type"] == "reflect" for activity in activities)


def test_mastery_updates_after_correct_challenge() -> None:
    parsed = parse_plain_text("定义：工作记忆负责短时信息保持。", source_name="notes.txt")
    representation = build_learning_representation(parsed)
    blueprint = build_course_blueprint(parsed, representation, "course_learning")
    activity = next(
        activity
        for chapter in blueprint["chapters"]
        for activity in chapter["activities"]
        if activity["type"] == "challenge"
    )
    result = evaluate_activity(activity, {"selected_index": activity["correct_index"]})
    next_state = update_mastery_state({"skills": blueprint["skills"], "completed_activity_ids": []}, activity, result, "high")
    skill = next_state["skills"][0]
    assert result["is_correct"] is True
    assert skill["current_mastery"] > 0.35
