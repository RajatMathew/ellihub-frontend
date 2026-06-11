import time

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


def test_get_template(client) -> None:
    response = client.get("/templates/invoice_v1")

    assert response.status_code == 200
    body = response.json()
    assert body["template_id"] == "invoice_v1"
    assert body["metadata"]["name"] == "Invoice Template"


def test_get_rfq_vendor_request_template(client) -> None:
    response = client.get("/templates/rfq_vendor_request_v1")

    assert response.status_code == 200
    body = response.json()
    assert body["template_id"] == "rfq_vendor_request_v1"
    assert body["metadata"]["name"] == "RFQ Vendor Request"


def test_render_returns_pdf(client) -> None:
    response = client.post(
        "/render",
        json={
            "template_id": "invoice_v1",
            "data": {
                "invoice_number": "INV-100",
                "issue_date": "2026-04-29",
                "customer": {"name": "Jane Doe", "email": "jane@example.com"},
                "items": [
                    {"description": "Consulting", "quantity": 2, "unit_price": 100, "total": 200}
                ],
                "notes": "Thank you"
            },
            "branding": {"company_name": "Acme"},
            "settings": {"filename": "invoice.pdf"}
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-1.4")
    assert response.headers["x-cache-hit"] == "false"


def test_render_rfq_vendor_request_returns_pdf(client) -> None:
    response = client.post(
        "/render",
        json={
            "template_id": "rfq_vendor_request_v1",
            "data": {
                "company": {
                    "name": "ELLI N.Y. DESIGN CORP.",
                    "address_lines": ["50-01 Metropolitan Ave", "Ridgewood, NY 11385"],
                    "phone": "718-418-9002",
                    "logo_path": "",
                },
                "rfq": {
                    "number": "RFQ-30300-001",
                    "title": "White oak material package",
                    "description": "Provide availability for the listed material.",
                    "issued_on": "05/04/2026",
                    "needed_by": "05/14/2026",
                    "type": "Material",
                    "status": "PUBLISHED",
                },
                "project": {
                    "name": "Sample Job",
                    "number": "30300",
                    "contract_number": "",
                },
                "vendor": {
                    "name": "Sample Vendor",
                    "address": "1 Vendor Way",
                    "email": "quotes@example.com",
                    "phone": "555-0100",
                },
                "request": {
                    "ship_to": "ELLI N.Y. DESIGN CORP.",
                    "requested_by": "Shalini",
                },
                "deliverables": [
                    {
                        "sequence": "1",
                        "description": "Solid plain sliced white oak",
                        "quantity": "600",
                        "unit": "LF",
                    }
                ],
                "deliverables_count": "1",
                "footer": {"left": "Elli NY Design Corp - RFQ-30300-001"},
            },
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-1.4")


def test_render_rejects_invalid_payload(client) -> None:
    response = client.post(
        "/render",
        json={"template_id": "invoice_v1", "data": {"invoice_number": "INV-100"}},
    )

    assert response.status_code == 400


def test_render_with_template_object_returns_download_url(client) -> None:
    response = client.post(
        "/render",
        json={
            "template_object": {
                "template_html": "<html><body><h1>{{ data.title }}</h1></body></html>",
                "styles_css": "body { color: #111; }",
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["title"],
                    "properties": {"title": {"type": "string"}},
                },
                "metadata": {"name": "Inline Template", "version": "1.0.0"},
            },
            "data": {"title": "Inline Render"},
            "settings": {"filename": "inline.pdf", "return_mode": "download_url"},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["download_url"].startswith("/output/")
    file_response = client.get(body["download_url"])
    assert file_response.status_code == 200
    assert file_response.headers["content-type"] == "application/pdf"


def test_force_regenerate_bypasses_cache(client) -> None:
    payload = {
        "template_id": "invoice_v1",
        "data": {
            "invoice_number": "INV-101",
            "issue_date": "2026-04-29",
            "customer": {"name": "Jane Doe", "email": "jane@example.com"},
            "items": [{"description": "Consulting", "quantity": 1, "unit_price": 99, "total": 99}],
        },
    }
    first = client.post("/render", json=payload)
    second = client.post("/render", json=payload | {"force_regenerate": True})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.headers["x-cache-hit"] == "false"
    assert second.headers["x-cache-hit"] == "false"


def test_batch_render_creates_job(client) -> None:
    response = client.post(
        "/render/batch",
        json={
            "template_id": "invoice_v1",
            "documents": [
                {
                    "invoice_number": "INV-100",
                    "issue_date": "2026-04-29",
                    "customer": {"name": "Jane Doe", "email": "jane@example.com"},
                    "items": [
                        {"description": "Consulting", "quantity": 2, "unit_price": 100, "total": 200}
                    ]
                }
            ]
        },
    )

    assert response.status_code == 202
    job_id = response.json()["job_id"]

    for _ in range(20):
        job_response = client.get(f"/jobs/{job_id}")
        if job_response.json()["status"] in {"completed", "failed"}:
            break
        time.sleep(0.05)

    assert job_response.status_code == 200
    assert job_response.json()["total_items"] == 1
    assert job_response.json()["results"][0]["status"] == "completed"


def test_missing_api_key_is_rejected() -> None:
    with TestClient(app) as unauthenticated_client:
        response = unauthenticated_client.get("/templates/invoice_v1")

    assert response.status_code == 401


def test_multiple_api_keys_are_accepted() -> None:
    original_api_keys = settings.api_keys
    object.__setattr__(settings, "api_keys", ("primary-key", "secondary-key"))

    try:
        with TestClient(app) as api_client:
            response = api_client.get(
                "/templates/invoice_v1",
                headers={settings.api_key_header: "secondary-key"},
            )
    finally:
        object.__setattr__(settings, "api_keys", original_api_keys)

    assert response.status_code == 200


def test_cors_preflight_allows_any_origin() -> None:
    with TestClient(app) as api_client:
        response = api_client.options(
            "/render",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": settings.api_key_header,
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
