from __future__ import annotations

import asyncio
import threading
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings
from app.models.api import BatchRenderItemResult, BatchJobResponse, RenderRequest
from app.services.cache_service import CacheService
from app.services.pdf_service import PdfService
from app.services.schema_service import SchemaService
from app.services.template_service import TemplateService


@dataclass
class BatchJobRecord:
    status: str = "pending"
    total_items: int = 0
    completed_items: int = 0
    failed_items: int = 0
    results: list[BatchRenderItemResult] = field(default_factory=list)


class RenderService:
    def __init__(
        self,
        template_service: TemplateService,
        schema_service: SchemaService,
        cache_service: CacheService,
        pdf_service: PdfService,
    ) -> None:
        self._template_service = template_service
        self._schema_service = schema_service
        self._cache_service = cache_service
        self._pdf_service = pdf_service
        self._jobs: dict[str, BatchJobRecord] = {}

    async def render(self, request: RenderRequest) -> dict[str, Any]:
        bundle = self._template_service.resolve_template_bundle(request.template_id, request.template_object)
        self._schema_service.validate(bundle["schema"], request.data)

        branding = request.branding.model_dump(exclude_none=True) if request.branding else {}
        render_settings = request.settings.model_dump(exclude_none=True) if request.settings else {}
        request_hash = self._cache_service.build_request_hash(
            bundle["template_fingerprint"],
            request.data,
            branding,
            render_settings,
        )

        cached_result = None if request.force_regenerate else self._cache_service.get_cached_result(request_hash)
        if cached_result is not None:
            return {
                "cache_hit": True,
                **cached_result,
            }

        html, bundle = await asyncio.wait_for(
            asyncio.to_thread(
                self._template_service.render_html,
                bundle,
                request.data,
                branding,
                render_settings,
            ),
            timeout=settings.render_timeout_seconds,
        )

        pdf_bytes = await asyncio.wait_for(
            asyncio.to_thread(
                self._pdf_service.render_pdf,
                html,
                bundle["styles_css"],
                self._pdf_service.resolve_base_url(bundle["template_dir"]),
            ),
            timeout=settings.render_timeout_seconds,
        )

        stored_output = self._cache_service.store_pdf(request_hash, self._resolve_filename(request, bundle), pdf_bytes)
        return {
            "cache_hit": False,
            **stored_output,
        }

    def create_batch_job(
        self,
        requests: list[RenderRequest],
        item_ids: list[str | None],
        chunk_size: int | None = None,
    ) -> BatchJobResponse:
        if len(requests) > settings.max_batch_items:
            raise ValueError(f"Batch size exceeds limit of {settings.max_batch_items}.")

        job_id = uuid.uuid4().hex
        effective_chunk_size = chunk_size or settings.batch_chunk_size
        self._jobs[job_id] = BatchJobRecord(status="pending", total_items=len(requests))
        threading.Thread(
            target=self._run_batch_job_sync,
            args=(job_id, requests, item_ids, effective_chunk_size),
            daemon=True,
        ).start()
        return BatchJobResponse(job_id=job_id, status="pending", total_items=len(requests), results=[])

    def get_batch_job(self, job_id: str) -> BatchJobResponse:
        record = self._jobs[job_id]
        return BatchJobResponse(
            job_id=job_id,
            status=record.status,
            total_items=record.total_items,
            completed_items=record.completed_items,
            failed_items=record.failed_items,
            results=record.results,
        )

    async def _run_batch_job(
        self,
        job_id: str,
        requests: list[RenderRequest],
        item_ids: list[str | None],
        chunk_size: int,
    ) -> None:
        record = self._jobs[job_id]
        record.status = "processing"
        results: list[BatchRenderItemResult] = []
        for start in range(0, len(requests), chunk_size):
            request_chunk = requests[start:start + chunk_size]
            item_chunk = item_ids[start:start + chunk_size]
            chunk_results = await asyncio.gather(
                *(self._render_batch_item(request, item_id) for request, item_id in zip(request_chunk, item_chunk))
            )
            results.extend(chunk_results)
            record.results = results
            record.completed_items = sum(1 for item in results if item.status == "completed")
            record.failed_items = sum(1 for item in results if item.status == "failed")
        record.status = "completed" if record.failed_items == 0 else "failed"

    def _run_batch_job_sync(
        self,
        job_id: str,
        requests: list[RenderRequest],
        item_ids: list[str | None],
        chunk_size: int,
    ) -> None:
        asyncio.run(self._run_batch_job(job_id, requests, item_ids, chunk_size))

    async def _render_batch_item(
        self,
        request: RenderRequest,
        item_id: str | None,
    ) -> BatchRenderItemResult:
        try:
            result = await self.render(request)
        except Exception as exc:
            return BatchRenderItemResult(item_id=item_id, status="failed", message=str(exc))

        return BatchRenderItemResult(
            item_id=item_id,
            status="completed",
            request_hash=result["request_hash"],
        )

    def _resolve_filename(self, request: RenderRequest, bundle: dict[str, Any]) -> str:
        if request.settings and request.settings.filename:
            return request.settings.filename
        return f"{self._template_service.get_template_key(bundle)}.pdf"
