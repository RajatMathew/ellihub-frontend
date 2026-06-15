from __future__ import annotations

import os
from pathlib import Path

from app.core.config import settings
from app.core.errors import PdfGenerationError


def _configure_macos_runtime() -> None:
    if os.name != "posix" or os.uname().sysname != "Darwin":
        return

    homebrew_lib = "/opt/homebrew/lib"
    current_fallback = os.environ.get("DYLD_FALLBACK_LIBRARY_PATH", "")
    fallback_parts = [part for part in current_fallback.split(":") if part]
    if homebrew_lib not in fallback_parts:
        fallback_parts.insert(0, homebrew_lib)
        os.environ["DYLD_FALLBACK_LIBRARY_PATH"] = ":".join(fallback_parts)

    xdg_cache_home = settings.cache_dir / ".xdg-cache"
    xdg_cache_home.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("XDG_CACHE_HOME", str(xdg_cache_home))


_configure_macos_runtime()

try:
    from weasyprint import CSS, HTML
except Exception:  # pragma: no cover - exercised in runtime environments missing native deps
    CSS = None
    HTML = None


class PdfService:
    def render_pdf(self, html: str, css: str, base_url: str) -> bytes:
        if HTML is None or CSS is None:
            raise PdfGenerationError(
                "WeasyPrint is not installed. Install dependencies from requirements.txt."
            )

        try:
            return HTML(string=html, base_url=base_url).write_pdf(stylesheets=[CSS(string=css)])
        except Exception as exc:  # pragma: no cover - depends on WeasyPrint internals
            raise PdfGenerationError(str(exc)) from exc

    @staticmethod
    def resolve_base_url(template_dir: Path) -> str:
        return f"{template_dir.as_uri()}/"
