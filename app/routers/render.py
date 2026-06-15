from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse

from app.core.dependencies import get_render_service
from app.core.errors import TemplateEngineError
from app.models.api import BatchRenderRequest, BatchJobResponse, RenderRequest, RenderResponse
from app.services.render_service import RenderService

router = APIRouter(tags=["render"])


@router.post("/render")
async def render_pdf(
    request: RenderRequest,
    render_service: RenderService = Depends(get_render_service),
) -> Response:
    try:
        result = await render_service.render(request)
    except TemplateEngineError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    template_key = request.template_id or result["file_id"]

    if request.settings and request.settings.return_mode == "download_url":
        body = RenderResponse(
            template_id=template_key,
            cache_hit=result["cache_hit"],
            request_hash=result["request_hash"],
            file_id=result["file_id"],
            filename=result["filename"],
            download_url=result["download_url"],
        )
        return JSONResponse(content=body.model_dump())

    headers = {
        "Content-Disposition": f'attachment; filename="{result["filename"]}"',
        "X-Request-Hash": result["request_hash"],
        "X-Cache-Hit": str(result["cache_hit"]).lower(),
    }
    return Response(content=result["pdf_bytes"], media_type="application/pdf", headers=headers)


@router.post("/render/batch", response_model=BatchJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def render_batch(
    request: BatchRenderRequest,
    render_service: RenderService = Depends(get_render_service),
) -> BatchJobResponse:
    try:
        requests, item_ids = request.to_render_requests()
        return render_service.create_batch_job(requests, item_ids, request.chunk_size)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
