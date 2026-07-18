# PDF Engine

FastAPI-based PDF template engine that renders sandboxed Jinja2 templates into PDFs.

Live documentation:

- `GET /`
- `GET /docs`

Repository documentation:

- [index.md](/Users/mac/projects/pdf-engine/index.md:1)

## Local Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Default API key for local development:

```text
X-API-Key: local-dev-key
```

Health checks:

```bash
curl http://127.0.0.1:8000/health/live
curl http://127.0.0.1:8000/health/ready
```

## Docker

Production-style container:

```bash
docker build --target production -t pdf-engine:prod .
docker run --rm -p 8000:8000 pdf-engine:prod
```

Or with Compose:

```bash
docker compose up api --build
```

Dokploy can use the included `docker-compose.yml` directly. Deploy the `api` service and route traffic to internal container port `8000`; the Compose file does not publish a host port. The named volume `pdf-engine-storage` persists generated PDFs, cache metadata, batch files, previews, and temp files across redeploys.

Set multiple API keys as a comma-separated environment variable:

```bash
PDF_ENGINE_API_KEYS=key-one,key-two,key-three
```

Use [.env.example](/Users/mac/projects/pdf-engine/.env.example:1) as the deployment environment template.

Domain support defaults to any host/origin for Dokploy routing:

```bash
PDF_ENGINE_ALLOWED_HOSTS=*
PDF_ENGINE_CORS_ALLOW_ORIGINS=*
```

## Tests

```bash
pytest
```

Inside the virtual environment:

```bash
.venv/bin/python -m pytest
```

## Template Layout

Each template bundle lives under `templates/{template_id}/` and should include:

- `template.html`
- `styles.css`
- `schema.json`
- `metadata.json`
- optional `partials/`
- optional `assets/`

For user-friendly template creation from an existing HTML design, the live root docs at `GET /` now include a copy-paste prompt that converts HTML/HTML+CSS into a valid template bundle.

## API

- `GET /`
- `GET /docs`
- `GET /health/live`
- `GET /health/ready`
- `GET /output/{file_id}`
- `POST /render`
- `POST /render/batch`
- `GET /jobs/{job_id}`
- `GET /templates/{template_id}`
- `POST /templates`

## Production Notes

- Root `/` is the live operational guide for the running service
- Readiness checks verify template/cache directories and PDF runtime availability
- Docker production target includes native PDF dependencies
- `POST /render` supports `template_id` or inline `template_object`
- `POST /render` supports `force_regenerate` to bypass dedupe cache
- The current app is production-facing, but auth, persistent batch storage, and external object storage are still future work
