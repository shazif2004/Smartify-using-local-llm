from app.services.ai_service import _build_quiz_prompt, _quiz_response_format


def build_prompt(difficulty: str) -> str:
    return _build_quiz_prompt(
        document_text="Course material",
        difficulty=difficulty,
        number_of_questions=5,
        was_truncated=False,
        repair_note="",
    )


def test_quiz_difficulties_produce_distinct_guidance():
    easy = build_prompt("easy")
    medium = build_prompt("medium")
    hard = build_prompt("hard")

    assert "avoid trick questions" in easy
    assert "one clear reasoning step" in medium
    assert "multi-step reasoning" in hard


def test_quiz_response_format_requires_every_choice_and_exact_counts():
    response_format = _quiz_response_format(5)
    schema = response_format["json_schema"]["schema"]

    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["strict"] is True
    assert schema["properties"]["questions"]["minItems"] == 5
    assert schema["properties"]["questions"]["maxItems"] == 5
    assert schema["properties"]["short_answer_questions"]["minItems"] == 3
    assert schema["properties"]["short_answer_questions"]["maxItems"] == 3

    question_schema = schema["$defs"]["GeneratedQuestion"]
    assert question_schema["additionalProperties"] is False
    assert "choice_c" in question_schema["required"]
