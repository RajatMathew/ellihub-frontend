from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from app.core.config import settings


class CacheService:
    def __init__(self, cache_dir: Path | None = None) -> None:
        self._cache_dir = cache_dir or settings.cache_dir
        self._cache_dir.mkdir(parents=True, exist_ok=True)
        self._generated_dir = settings.generated_dir
        self._generated_dir.mkdir(parents=True, exist_ok=True)

    def build_request_hash(
        self,
        template_fingerprint: str,
        data: dict[str, Any],
        branding: dict[str, Any] | None,
        render_settings: dict[str, Any] | None,
    ) -> str:
        payload = {
            "template": template_fingerprint,
            "data": data,
            "branding": branding or {},
            "settings": render_settings or {},
        }
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def get_cached_result(self, request_hash: str) -> dict[str, Any] | None:
        manifest_path = self._manifest_path(request_hash)
        if not manifest_path.exists():
            return None
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        pdf_path = self._pdf_path(manifest["file_id"])
        if not pdf_path.exists():
            return None
        return {
            "request_hash": request_hash,
            "file_id": manifest["file_id"],
            "filename": manifest["filename"],
            "download_url": self.get_output_url(manifest["file_id"]),
            "pdf_bytes": pdf_path.read_bytes(),
        }

    def store_pdf(self, request_hash: str, filename: str, content: bytes) -> dict[str, Any]:
        file_id = request_hash
        path = self._pdf_path(file_id)
        path.write_bytes(content)
        manifest = {"file_id": file_id, "filename": filename}
        self._manifest_path(request_hash).write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        return {
            "request_hash": request_hash,
            "file_id": file_id,
            "filename": filename,
            "download_url": self.get_output_url(file_id),
            "pdf_bytes": content,
        }

    def get_output_url(self, file_id: str) -> str:
        return f"/output/{file_id}"

    def get_output_path(self, file_id: str) -> Path:
        return self._pdf_path(file_id)

    def get_output_metadata(self, file_id: str) -> dict[str, Any]:
        pdf_path = self._pdf_path(file_id)
        if not pdf_path.exists():
            raise FileNotFoundError(file_id)
        return {"file_id": file_id, "filename": f"{file_id}.pdf", "path": pdf_path}

    def _pdf_path(self, file_id: str) -> Path:
        return self._generated_dir / f"{file_id}.pdf"

    def _manifest_path(self, request_hash: str) -> Path:
        return self._cache_dir / f"{request_hash}.json"
