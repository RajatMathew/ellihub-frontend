from __future__ import annotations

import json
from functools import lru_cache
import hashlib
from pathlib import Path
from typing import Any

from jinja2 import DictLoader, FileSystemLoader, StrictUndefined, TemplateNotFound
from jinja2.sandbox import SandboxedEnvironment
from markupsafe import Markup

from app.core.config import settings
from app.core.errors import TemplateNotFoundError, TemplateSecurityError
from app.models.api import TemplateObjectPayload


class TemplateService:
    def __init__(self, templates_dir: Path | None = None) -> None:
        self._templates_dir = templates_dir or settings.templates_dir

    def get_template_bundle(self, template_id: str) -> dict[str, Any]:
        template_dir = self._template_dir(template_id)
        if not template_dir.exists():
            raise TemplateNotFoundError(f"Template '{template_id}' was not found.")

        template_html = (template_dir / "template.html").read_text(encoding="utf-8")
        styles_css = (template_dir / "styles.css").read_text(encoding="utf-8")
        schema = self._read_json(template_dir / "schema.json")
        metadata = self._read_json(template_dir / "metadata.json")
        partials = self._read_partials(template_dir / "partials")
        return {
            "template_id": template_id,
            "template_kind": "stored",
            "template_dir": template_dir,
            "metadata": metadata,
            "schema": schema,
            "styles_css": styles_css,
            "template_html": template_html,
            "partials": partials,
            "template_fingerprint": self._build_template_fingerprint(
                template_html=template_html,
                styles_css=styles_css,
                schema=schema,
                metadata=metadata,
                partials=partials,
            ),
        }

    def create_template_bundle(
        self,
        template_id: str,
        template_html: str,
        styles_css: str,
        schema: dict[str, Any],
        metadata: dict[str, Any],
        partials: dict[str, str],
    ) -> dict[str, Any]:
        template_dir = self._template_dir(template_id)
        template_dir.mkdir(parents=True, exist_ok=False)
        (template_dir / "partials").mkdir(exist_ok=True)
        (template_dir / "assets").mkdir(exist_ok=True)
        (template_dir / "template.html").write_text(template_html, encoding="utf-8")
        (template_dir / "styles.css").write_text(styles_css, encoding="utf-8")
        (template_dir / "schema.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")
        (template_dir / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        for name, content in partials.items():
            partial_path = template_dir / "partials" / name
            partial_path.parent.mkdir(parents=True, exist_ok=True)
            partial_path.write_text(content, encoding="utf-8")

        self._get_environment.cache_clear()
        return self.get_template_bundle(template_id)

    def resolve_template_bundle(
        self,
        template_id: str | None = None,
        template_object: TemplateObjectPayload | None = None,
    ) -> dict[str, Any]:
        if template_id:
            return self.get_template_bundle(template_id)
        if template_object:
            return self._build_inline_template_bundle(template_object)
        raise TemplateNotFoundError("No template source was provided.")

    def render_html(
        self,
        bundle: dict[str, Any] | str,
        data: dict[str, Any],
        branding: dict[str, Any] | None,
        render_settings: dict[str, Any] | None,
    ) -> tuple[str, dict[str, Any]]:
        if isinstance(bundle, str):
            bundle = self.get_template_bundle(bundle)
        environment = self._get_environment(bundle["template_fingerprint"], bundle)
        context = {
            "data": data,
            "branding": branding or {},
            "settings": render_settings or {},
        }

        try:
            template = environment.get_template("template.html")
            html = template.render(**context)
        except TemplateNotFound as exc:
            raise TemplateNotFoundError(f"Missing template file: {exc.name}") from exc
        except Exception as exc:
            raise TemplateSecurityError(str(exc)) from exc

        return html, bundle

    def get_template_key(self, bundle: dict[str, Any]) -> str:
        return bundle.get("template_id", bundle["template_fingerprint"])

    def _template_dir(self, template_id: str) -> Path:
        return self._templates_dir / template_id

    def _read_json(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            raise TemplateNotFoundError(f"Missing template asset: {path.name}")
        return json.loads(path.read_text(encoding="utf-8"))

    def _read_partials(self, partials_dir: Path) -> dict[str, str]:
        if not partials_dir.exists():
            return {}
        return {
            str(path.relative_to(partials_dir)).replace("\\", "/"): path.read_text(encoding="utf-8")
            for path in partials_dir.rglob("*.html")
        }

    def _get_environment(self, cache_key: str, bundle: dict[str, Any]) -> SandboxedEnvironment:
        if bundle["template_kind"] == "stored":
            return self._get_stored_environment(str(bundle["template_dir"]))
        return self._get_inline_environment(
            cache_key,
            bundle["template_html"],
            json.dumps(bundle["partials"], sort_keys=True),
        )

    @lru_cache(maxsize=128)
    def _get_stored_environment(self, template_dir: str) -> SandboxedEnvironment:
        loader = FileSystemLoader(template_dir)
        return self._build_environment(loader)

    @lru_cache(maxsize=128)
    def _get_inline_environment(
        self,
        template_fingerprint: str,
        template_html: str,
        partials_json: str,
    ) -> SandboxedEnvironment:
        partials = json.loads(partials_json)
        loader = DictLoader(
            {"template.html": template_html}
            | {f"partials/{name}": content for name, content in partials.items()}
        )
        return self._build_environment(loader)

    def _build_environment(self, loader: FileSystemLoader | DictLoader) -> SandboxedEnvironment:
        environment = SandboxedEnvironment(
            loader=loader,
            autoescape=True,
            undefined=StrictUndefined,
            enable_async=False,
        )
        environment.globals.clear()
        environment.filters.clear()
        environment.filters["safe"] = Markup
        environment.tests.clear()
        return environment

    def _build_inline_template_bundle(self, template_object: TemplateObjectPayload) -> dict[str, Any]:
        template_html = template_object.template_html
        styles_css = template_object.styles_css
        schema = template_object.schema_definition
        metadata = template_object.metadata or {"name": "Inline Template", "version": "1.0.0"}
        partials = template_object.partials
        return {
            "template_id": metadata.get("name", "inline_template").lower().replace(" ", "_"),
            "template_kind": "inline",
            "template_dir": settings.templates_dir,
            "metadata": metadata,
            "schema": schema,
            "styles_css": styles_css,
            "template_html": template_html,
            "partials": partials,
            "template_fingerprint": self._build_template_fingerprint(
                template_html=template_html,
                styles_css=styles_css,
                schema=schema,
                metadata=metadata,
                partials=partials,
            ),
        }

    def _build_template_fingerprint(
        self,
        template_html: str,
        styles_css: str,
        schema: dict[str, Any],
        metadata: dict[str, Any],
        partials: dict[str, str],
    ) -> str:
        serialized = json.dumps(
            {
                "template_html": template_html,
                "styles_css": styles_css,
                "schema": schema,
                "metadata": metadata,
                "partials": partials,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
