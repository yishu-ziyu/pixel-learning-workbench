from app.services.analysis import build_learning_representation, recommend_intent
from app.services.blueprint import build_course_blueprint
from app.services.mastery import evaluate_activity, update_mastery_state
from app.services.parser import extract_readable_html, parse_plain_text, parse_web_url


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


def test_web_url_parser_extracts_readable_text(monkeypatch) -> None:
    html = """
    <html>
      <head><style>.hidden { display: none; }</style><script>ignore()</script></head>
      <body>
        <h1>Learning with source material</h1>
        <p>This article explains how a learner can transform a source document into reading, structure mapping, and quiz practice.</p>
        <p>The key method is to keep every question tied to visible evidence from the original material.</p>
      </body>
    </html>
    """

    monkeypatch.setattr("app.services.parser.fetch_web_text", lambda url: extract_readable_html(html))
    parsed = parse_web_url("https://example.com/learning")

    assert parsed.parse_strategy == "web_url"
    assert parsed.metadata["source_name"] == "https://example.com/learning"
    assert "source document" in " ".join(parsed.paragraphs)
    assert "ignore" not in " ".join(parsed.paragraphs)


def test_blueprint_contains_reflect_activity() -> None:
    parsed = parse_plain_text("因为论证需要前提，所以我们需要识别隐含条件。", source_name="argument.txt")
    representation = build_learning_representation(parsed)
    blueprint = build_course_blueprint(parsed, representation, "logic_breakdown")
    activities = [activity for chapter in blueprint["chapters"] for activity in chapter["activities"]]
    assert any(activity["type"] == "reflect" for activity in activities)


def test_blueprint_activities_surface_material_context() -> None:
    parsed = parse_plain_text(
        """
        Abstract
        This paper studies retrieval-augmented tutoring systems for difficult reading.
        Methods
        We compare guided practice with passive reading and measure delayed recall.
        Results
        Guided practice improves transfer and explanation quality.
        """,
        source_name="paper.txt",
    )
    representation = build_learning_representation(parsed)
    blueprint = build_course_blueprint(parsed, representation, "deep_read")
    activities = [activity for chapter in blueprint["chapters"] for activity in chapter["activities"]]
    first_scene = activities[0]

    assert first_scene["type"] == "scene"
    assert "source_context" in first_scene
    assert first_scene["source_context"]["material_excerpt"]
    assert first_scene["source_context"]["graph_label"]
    assert first_scene["source_context"]["why_this_step"]
    assert "先看这段材料" in first_scene["body"]
    assert "retrieval-augmented tutoring" in first_scene["source_context"]["material_excerpt"]


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
