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


def test_get_purchase_order_template(client) -> None:
    response = client.get("/templates/purchase_order_v1")

    assert response.status_code == 200
    body = response.json()
    assert body["template_id"] == "purchase_order_v1"
    assert body["metadata"]["name"] == "Purchase Order"


def test_get_sub_change_order_template(client) -> None:
    response = client.get("/templates/sub_change_order_v1")

    assert response.status_code == 200
    body = response.json()
    assert body["template_id"] == "sub_change_order_v1"
    assert body["metadata"]["name"] == "Sub Change Order"


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
                    "rfq_date": "05/14/2026",
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
                "terms": {
                    "included": True,
                    "html": "<p><strong>Quotes</strong> must include delivery and lead time.</p>",
                },
                "notice": {
                    "included": True,
                    "title": "Review before quoting",
                    "html": "<p>Review all drawings before submitting a quote.</p>",
                },
                "footer": {"left": "Elli NY Design Corp - RFQ-30300-001"},
            },
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-1.4")


def test_render_purchase_order_returns_pdf_with_terms(client) -> None:
    response = client.post(
        "/render",
        json={
            "template_id": "purchase_order_v1",
            "data": {
                "company": {
                    "name": "ELLI N.Y. DESIGN CORP.",
                    "address_lines": ["50-01 Metropolitan Ave", "Ridgewood, NY 11385"],
                    "phone": "718-418-9002",
                    "logo_path": "",
                },
                "purchase_order": {
                    "number": "PO-30300-001",
                    "description": "White oak material package",
                    "status": "ISSUED",
                    "issued_on": "05/23/2026",
                    "expected_date": "06/01/2026",
                    "trade_category": "Material",
                    "lead_time": "14 days",
                    "payment_terms": "Net 30",
                },
                "project": {
                    "name": "Sample Job",
                    "number": "30300",
                    "contract_number": "",
                },
                "vendor": {
                    "name": "Sample Vendor",
                    "address": "1 Vendor Way",
                    "email": "orders@example.com",
                    "phone": "555-0100",
                },
                "ship_to": {"address": "50-01 Metropolitan Ave, Ridgewood, NY 11385"},
                "request": {"requested_by": "Shalini"},
                "line_items": [
                    {
                        "line_number": "1",
                        "description": "Solid plain sliced white oak",
                        "quantity": "600",
                        "unit": "LF",
                        "unit_price": "$4.00",
                        "amount": "$2,400.00",
                        "notes": "",
                    }
                ],
                "line_items_count": "1",
                "summary": {
                    "subtotal": "$2,400.00",
                    "negotiated_discount": "$100.00",
                    "shipping_and_handling_fee": "$25.00",
                    "tax_label": "Tax",
                    "tax_amount": "$0.00",
                    "total": "$2,325.00",
                    "retainage_percent": "0%",
                    "retainage_amount": "$0.00",
                },
                "terms": {
                    "included": True,
                    "html": "<p><strong>Payment</strong> is due according to PO terms.</p>",
                },
                "notice": {
                    "included": True,
                    "title": "DO NOT START FABRICATION BEFORE READING THIS",
                    "html": "<p>Please do not order material without approval signatures.</p>",
                },
                "footer": {"left": "Elli NY Design Corp - PO-30300-001"},
            },
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-1.4")


def test_render_sub_change_order_returns_pdf_with_terms(client) -> None:
    response = client.post(
        "/render",
        json={
            "template_id": "sub_change_order_v1",
            "data": {
                "company": {
                    "name": "ELLI N.Y. DESIGN CORP.",
                    "address_lines": ["50-01 Metropolitan Ave", "Ridgewood, NY 11385"],
                    "phone": "718-418-9002",
                    "logo_path": "",
                },
                "sub_change_order": {
                    "number": "SCO-30300-001",
                    "title": "Additional white oak shelves",
                    "description": "Add shelves requested after PO issue.",
                    "status": "APPROVED",
                    "date": "06/05/2026",
                    "change_type": "Scope Change",
                    "approved_on": "06/05/2026",
                    "rejected_on": "",
                    "voided_on": "",
                    "reason_label": "",
                    "reason": "",
                },
                "purchase_order": {
                    "number": "PO-30300-001",
                    "description": "White oak material package",
                    "status": "ISSUED",
                    "trade_category": "Material",
                    "payment_terms": "Net 30",
                    "total": "$2,400.00",
                },
                "project": {
                    "name": "Sample Job",
                    "number": "30300",
                    "contract_number": "",
                    "address": "50-01 Metropolitan Ave, Ridgewood, NY 11385",
                },
                "vendor": {
                    "name": "Sample Vendor",
                    "address": "1 Vendor Way",
                    "email": "orders@example.com",
                    "phone": "555-0100",
                },
                "request": {"requested_by": "Shalini"},
                "line_items": [
                    {
                        "line_number": "1",
                        "description": "Additional solid plain sliced white oak shelves",
                        "cost_code": "06100 - Rough Carpentry",
                        "quantity": "12.50",
                        "unit": "EA",
                        "unit_price": "$80.00",
                        "amount": "$1,000.00",
                    }
                ],
                "line_items_count": "1",
                "summary": {
                    "subtotal": "$1,000.00",
                    "negotiated_discount": "$25.50",
                    "shipping_and_handling_fee": "$40.25",
                    "tax_label": "Tax (8.875%)",
                    "tax_amount": "$90.00",
                    "total": "$1,104.75",
                },
                "terms": {
                    "included": True,
                    "html": "<p><strong>SCO</strong> work follows approved change terms.</p>",
                },
                "notice": {
                    "included": True,
                    "title": "Review Approved Change Before Proceeding",
                    "html": "<p>Confirm approvals before starting changed work.</p>",
                },
                "footer": {"left": "Elli NY Design Corp - SCO-30300-001"},
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
