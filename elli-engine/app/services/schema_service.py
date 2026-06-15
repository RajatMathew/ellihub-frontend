from __future__ import annotations

import json
from typing import Any

from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError as JsonSchemaValidationError

from app.core.config import settings
from app.core.errors import TemplateValidationError


class SchemaService:
    def validate(self, schema: dict[str, Any], payload: dict[str, Any]) -> None:
        self._validate_payload_size(payload)
        validator = Draft202012Validator(schema)
        errors = sorted(validator.iter_errors(payload), key=lambda item: list(item.path))
        if errors:
            messages = [self._format_error(error) for error in errors]
            raise TemplateValidationError("; ".join(messages))

        allowed_fields = set(schema.get("properties", {}).keys())
        if allowed_fields and any(key not in allowed_fields for key in payload):
            raise TemplateValidationError("Payload contains fields outside schema properties.")

    def _validate_payload_size(self, payload: dict[str, Any]) -> None:
        serialized = json.dumps(payload)
        if len(serialized.encode("utf-8")) > settings.max_payload_bytes:
            raise TemplateValidationError("Payload exceeds configured size limit.")

    def _format_error(self, error: JsonSchemaValidationError) -> str:
        location = ".".join(str(part) for part in error.path) or "payload"
        return f"{location}: {error.message}"
