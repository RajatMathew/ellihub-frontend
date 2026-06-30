from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.middleware import ApiKeyMiddleware
from app.core.dependencies import get_render_service, get_template_service
from app.routers.index import router as index_router
from app.routers.jobs import router as jobs_router
from app.routers.output import router as output_router
from app.routers.render import router as render_router
from app.routers.templates import router as templates_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    settings.cache_dir.mkdir(parents=True, exist_ok=True)
    settings.generated_dir.mkdir(parents=True, exist_ok=True)
    settings.batch_dir.mkdir(parents=True, exist_ok=True)
    settings.previews_dir.mkdir(parents=True, exist_ok=True)
    settings.temp_dir.mkdir(parents=True, exist_ok=True)
    settings.templates_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="PDF Template Engine", lifespan=lifespan)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(settings.allowed_hosts))
app.add_middleware(ApiKeyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
    allow_methods=list(settings.cors_allow_methods),
    allow_headers=list(settings.cors_allow_headers),
)
app.mount("/cache", StaticFiles(directory=settings.cache_dir), name="cache")


app.include_router(render_router)
app.include_router(templates_router)
app.include_router(jobs_router)
app.include_router(output_router)
app.include_router(index_router)
