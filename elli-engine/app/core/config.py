from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path


def parse_csv_env(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if value is None:
        return default

    items = tuple(item.strip() for item in value.split(",") if item.strip())
    return items or default


def resolve_api_keys() -> tuple[str, ...]:
    api_keys = parse_csv_env(os.getenv("PDF_ENGINE_API_KEYS"), ())
    if api_keys:
        return api_keys

    return (os.getenv("PDF_ENGINE_API_KEY", "local-dev-key"),)


@dataclass(frozen=True)
class Settings:
    project_root: Path = Path(__file__).resolve().parents[2]
    templates_dir: Path = Path(os.getenv("PDF_ENGINE_TEMPLATES_DIR", project_root / "templates"))
    storage_dir: Path = Path(os.getenv("PDF_ENGINE_STORAGE_DIR", project_root / "storage"))
    cache_dir: Path = Path(os.getenv("PDF_ENGINE_CACHE_DIR", storage_dir / "cache"))
    generated_dir: Path = Path(os.getenv("PDF_ENGINE_GENERATED_DIR", storage_dir / "generated"))
    batch_dir: Path = Path(os.getenv("PDF_ENGINE_BATCH_DIR", storage_dir / "batch"))
    previews_dir: Path = Path(os.getenv("PDF_ENGINE_PREVIEWS_DIR", storage_dir / "previews"))
    temp_dir: Path = Path(os.getenv("PDF_ENGINE_TEMP_DIR", storage_dir / "temp"))
    render_timeout_seconds: float = float(os.getenv("PDF_ENGINE_RENDER_TIMEOUT_SECONDS", "10.0"))
    max_payload_bytes: int = int(os.getenv("PDF_ENGINE_MAX_PAYLOAD_BYTES", "250000"))
    max_batch_items: int = int(os.getenv("PDF_ENGINE_MAX_BATCH_ITEMS", "25"))
    batch_chunk_size: int = int(os.getenv("PDF_ENGINE_BATCH_CHUNK_SIZE", "100"))
    api_key_header: str = os.getenv("PDF_ENGINE_API_KEY_HEADER", "X-API-Key")
    api_key: str = os.getenv("PDF_ENGINE_API_KEY", "local-dev-key")
    api_keys: tuple[str, ...] = resolve_api_keys()
    allowed_hosts: tuple[str, ...] = parse_csv_env(os.getenv("PDF_ENGINE_ALLOWED_HOSTS"), ("*",))
    cors_allow_origins: tuple[str, ...] = parse_csv_env(
        os.getenv("PDF_ENGINE_CORS_ALLOW_ORIGINS"),
        ("*",),
    )
    cors_allow_methods: tuple[str, ...] = parse_csv_env(
        os.getenv("PDF_ENGINE_CORS_ALLOW_METHODS"),
        ("*",),
    )
    cors_allow_headers: tuple[str, ...] = parse_csv_env(
        os.getenv("PDF_ENGINE_CORS_ALLOW_HEADERS"),
        ("*",),
    )


settings = Settings()
