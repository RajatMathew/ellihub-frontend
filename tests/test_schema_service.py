import pytest

from app.core.errors import TemplateValidationError
from app.services.schema_service import SchemaService


SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["name"],
    "properties": {
        "name": {"type": "string"},
        "count": {"type": "number"},
    },
}


def test_schema_validation_accepts_valid_payload() -> None:
    service = SchemaService()
    service.validate(SCHEMA, {"name": "example", "count": 3})


def test_schema_validation_rejects_invalid_payload() -> None:
    service = SchemaService()

    with pytest.raises(TemplateValidationError):
        service.validate(SCHEMA, {"count": 3})


def test_schema_validation_rejects_unknown_fields() -> None:
    service = SchemaService()

    with pytest.raises(TemplateValidationError):
        service.validate(SCHEMA, {"name": "example", "extra": True})
