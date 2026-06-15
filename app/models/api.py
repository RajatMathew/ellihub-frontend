from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BrandingPayload(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None


class RenderSettingsPayload(BaseModel):
    filename: Optional[str] = None
    return_mode: Literal["inline", "download_url"] = "inline"


class TemplateObjectPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    template_html: str = Field(min_length=1)
    styles_css: str = ""
    schema_definition: Dict[str, Any] = Field(alias="schema", serialization_alias="schema")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    partials: Dict[str, str] = Field(default_factory=dict)


class RenderRequest(BaseModel):
    template_id: Optional[str] = Field(default=None, min_length=1)
    template_object: Optional[TemplateObjectPayload] = None
    data: Dict[str, Any]
    branding: Optional[BrandingPayload] = None
    settings: Optional[RenderSettingsPayload] = None
    force_regenerate: bool = False

    @model_validator(mode="after")
    def validate_template_source(self) -> "RenderRequest":
        if not self.template_id and not self.template_object:
            raise ValueError("Either template_id or template_object must be provided.")
        if self.template_id and self.template_object:
            raise ValueError("Provide either template_id or template_object, not both.")
        return self


class RenderResponse(BaseModel):
    template_id: str
    cache_hit: bool
    request_hash: str
    file_id: str
    filename: str
    download_url: Optional[str] = None


class BatchRenderItem(BaseModel):
    item_id: Optional[str] = None
    request: RenderRequest


class BatchRenderRequest(BaseModel):
    items: Optional[List[BatchRenderItem]] = None
    template_id: Optional[str] = None
    template_object: Optional[TemplateObjectPayload] = None
    documents: Optional[List[Dict[str, Any]]] = None
    branding: Optional[BrandingPayload] = None
    settings: Optional[RenderSettingsPayload] = None
    force_regenerate: bool = False
    chunk_size: Optional[int] = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_batch_shape(self) -> "BatchRenderRequest":
        has_legacy_items = bool(self.items)
        has_advanced_shape = bool(self.documents)
        if not has_legacy_items and not has_advanced_shape:
            raise ValueError("Provide either items or documents.")
        if has_legacy_items and has_advanced_shape:
            raise ValueError("Provide either items or documents, not both.")
        if has_advanced_shape and not (self.template_id or self.template_object):
            raise ValueError("Batch documents require template_id or template_object.")
        return self

    def to_render_requests(self) -> tuple[List[RenderRequest], List[Optional[str]]]:
        if self.items:
            return [item.request for item in self.items], [item.item_id for item in self.items]

        requests: List[RenderRequest] = []
        item_ids: List[Optional[str]] = []
        for index, document in enumerate(self.documents or [], start=1):
            requests.append(
                RenderRequest(
                    template_id=self.template_id,
                    template_object=self.template_object,
                    data=document,
                    branding=self.branding,
                    settings=self.settings,
                    force_regenerate=self.force_regenerate,
                )
            )
            item_ids.append(f"doc-{index}")
        return requests, item_ids


class BatchRenderItemResult(BaseModel):
    item_id: Optional[str] = None
    status: Literal["completed", "failed"]
    request_hash: Optional[str] = None
    message: Optional[str] = None


class BatchJobResponse(BaseModel):
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    total_items: int = 0
    completed_items: int = 0
    failed_items: int = 0
    results: List[BatchRenderItemResult] = Field(default_factory=list)


class TemplateCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    template_id: str = Field(min_length=1, pattern=r"^[a-z0-9_]+$")
    template_html: str = Field(min_length=1)
    styles_css: str = ""
    schema_definition: Dict[str, Any] = Field(alias="schema", serialization_alias="schema")
    metadata: Dict[str, Any]
    partials: Dict[str, str] = Field(default_factory=dict)


class TemplateMetadataResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    template_id: str
    metadata: Dict[str, Any]
    schema_definition: Dict[str, Any] = Field(alias="schema", serialization_alias="schema")
