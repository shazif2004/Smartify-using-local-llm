from app.schemas.focus import FocusBreakdown


def test_focus_schema_is_strict_and_bounded() -> None:
    schema = FocusBreakdown.model_json_schema()
    concepts = schema["properties"]["concepts"]
    concept = schema["$defs"]["FocusConcept"]

    assert schema["additionalProperties"] is False
    assert concepts["minItems"] == 2
    assert concepts["maxItems"] == 8
    assert concept["additionalProperties"] is False
    assert concept["properties"]["key_points"]["minItems"] == 2
    assert concept["properties"]["key_points"]["maxItems"] == 4
    assert "plain_explanation" in concept["required"]
    assert "check_your_understanding" in concept["required"]
