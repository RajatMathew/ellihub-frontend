from app.services.cache_service import CacheService


def test_request_hash_is_stable() -> None:
    service = CacheService()

    first = service.build_request_hash(
        "invoice_v1",
        {"invoice_number": "INV-1"},
        {"company_name": "Acme"},
        {"filename": "invoice.pdf"},
    )
    second = service.build_request_hash(
        "invoice_v1",
        {"invoice_number": "INV-1"},
        {"company_name": "Acme"},
        {"filename": "invoice.pdf"},
    )

    assert first == second


def test_request_hash_changes_with_payload() -> None:
    service = CacheService()

    first = service.build_request_hash("invoice_v1", {"invoice_number": "INV-1"}, None, None)
    second = service.build_request_hash("invoice_v1", {"invoice_number": "INV-2"}, None, None)

    assert first != second
