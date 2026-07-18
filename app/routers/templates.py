from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_template_service
from app.core.errors import TemplateEngineError
from app.models.api import TemplateCreateRequest, TemplateMetadataResponse
from app.services.template_service import TemplateService

router = APIRouter(tags=["templates"])


@router.get("/templates/{template_id}", response_model=TemplateMetadataResponse)
async def get_template(
    template_id: str,
    template_service: TemplateService = Depends(get_template_service),
) -> TemplateMetadataResponse:
    try:
        bundle = template_service.get_template_bundle(template_id)
    except TemplateEngineError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return TemplateMetadataResponse(
        template_id=template_id,
        metadata=bundle["metadata"],
        schema_definition=bundle["schema"],
    )


@router.post("/templates", response_model=TemplateMetadataResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    request: TemplateCreateRequest,
    template_service: TemplateService = Depends(get_template_service),
) -> TemplateMetadataResponse:
    try:
        bundle = template_service.create_template_bundle(
            template_id=request.template_id,
            template_html=request.template_html,
            styles_css=request.styles_css,
            schema=request.schema_definition,
            metadata=request.metadata,
            partials=request.partials,
        )
    except FileExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Template already exists.") from exc
    except TemplateEngineError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return TemplateMetadataResponse(
        template_id=request.template_id,
        metadata=bundle["metadata"],
        schema_definition=bundle["schema"],
    )
