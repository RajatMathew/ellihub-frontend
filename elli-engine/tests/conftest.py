from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.dependencies import cache_service
from app.main import app


def fake_render_pdf(_: str, __: str, ___: str) -> bytes:
    return b"%PDF-1.4 fake pdf"


import pytest


@pytest.fixture(autouse=True)
def patch_pdf_service(monkeypatch):
    monkeypatch.setattr("app.core.dependencies.pdf_service.render_pdf", fake_render_pdf)


@pytest.fixture(autouse=True)
def isolate_cache_dir(tmp_path, monkeypatch):
    test_cache_dir = tmp_path / "cache"
    test_generated_dir = tmp_path / "generated"
    test_cache_dir.mkdir()
    test_generated_dir.mkdir()
    monkeypatch.setattr(cache_service, "_cache_dir", test_cache_dir)
    monkeypatch.setattr(cache_service, "_generated_dir", test_generated_dir)


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        test_client.headers[settings.api_key_header] = settings.api_keys[0]
        yield test_client
