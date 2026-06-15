from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from app.core.dependencies import get_cache_service
from app.services.cache_service import CacheService

router = APIRouter(tags=["output"])


@router.get("/output/{file_id}")
async def get_output(
    file_id: str,
    cache_service: CacheService = Depends(get_cache_service),
) -> FileResponse:
    try:
        metadata = cache_service.get_output_metadata(file_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Output file not found.") from exc

    return FileResponse(
        path=metadata["path"],
        media_type="application/pdf",
        filename=metadata["filename"],
    )
