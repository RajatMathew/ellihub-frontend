def test_root_returns_html_documentation(client) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert "Production Guide for the Entire App" in response.text
    assert "POST /render" in response.text


def test_health_live_returns_ok(client) -> None:
    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "live"}


def test_health_ready_returns_checks(client) -> None:
    response = client.get("/health/ready")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["checks"]["templates_dir_exists"] is True
    assert body["checks"]["cache_dir_exists"] is True
    assert body["checks"]["pdf_runtime_available"] is True
