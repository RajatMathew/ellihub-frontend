from app.services.cache_service import CacheService
from app.services.pdf_service import PdfService
from app.services.render_service import RenderService
from app.services.schema_service import SchemaService
from app.services.template_service import TemplateService

template_service = TemplateService()
schema_service = SchemaService()
cache_service = CacheService()
pdf_service = PdfService()
render_service = RenderService(
    template_service=template_service,
    schema_service=schema_service,
    cache_service=cache_service,
    pdf_service=pdf_service,
)


def get_template_service() -> TemplateService:
    return template_service


def get_render_service() -> RenderService:
    return render_service


def get_cache_service() -> CacheService:
    return cache_service
