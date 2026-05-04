from __future__ import annotations

from typing import Any, Protocol

from app.config import settings
from app.schemas import ParsedDocument


class LearningModelProvider(Protocol):
    name: str

    def build_learning_representation(self, parsed_document: ParsedDocument) -> dict[str, Any]:
        """Return the structured learning representation for parsed material."""

    def build_course_blueprint(self, parsed_document: ParsedDocument, learning_representation: dict[str, Any], intent: str) -> dict[str, Any]:
        """Return the playable course blueprint for a learning representation."""

    def evaluate_activity(self, activity: dict[str, Any], answer: dict[str, Any]) -> dict[str, Any]:
        """Evaluate a learner response for a course activity."""


class HeuristicLearningModelProvider:
    name = "heuristic"

    def build_learning_representation(self, parsed_document: ParsedDocument) -> dict[str, Any]:
        from app.services.analysis import build_heuristic_learning_representation

        return build_heuristic_learning_representation(parsed_document)

    def build_course_blueprint(self, parsed_document: ParsedDocument, learning_representation: dict[str, Any], intent: str) -> dict[str, Any]:
        from app.services.blueprint import build_heuristic_course_blueprint

        return build_heuristic_course_blueprint(parsed_document, learning_representation, intent)

    def evaluate_activity(self, activity: dict[str, Any], answer: dict[str, Any]) -> dict[str, Any]:
        from app.services.mastery import evaluate_heuristic_activity

        return evaluate_heuristic_activity(activity, answer)


def get_learning_model_provider() -> LearningModelProvider:
    if settings.model_provider == "heuristic":
        return HeuristicLearningModelProvider()

    raise ValueError(f"Unsupported PIXEL_MODEL_PROVIDER={settings.model_provider!r}. Available providers: heuristic.")
