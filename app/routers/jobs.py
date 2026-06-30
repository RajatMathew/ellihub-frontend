from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_render_service
from app.models.api import BatchJobResponse
from app.services.render_service import RenderService

router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=BatchJobResponse)
async def get_job(
    job_id: str,
    render_service: RenderService = Depends(get_render_service),
) -> BatchJobResponse:
    try:
        return render_service.get_batch_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.") from exc
