# PDF Engine Usage Guide

This project is a FastAPI-based PDF template engine. It stores HTML/CSS/Jinja template bundles on disk, validates payloads with JSON Schema, renders HTML through sandboxed Jinja2, converts it to PDF with WeasyPrint, and caches output by request hash.

The live service documentation is now hosted directly at the FastAPI root route:

- `GET /`

The machine-readable and interactive docs are here:

- `GET /docs`
- `GET /health/live`
- `GET /health/ready`

Authenticated API routes require:

```text
X-API-Key: local-dev-key
```

## What It Does

- Stores templates in `templates/{template_id}/`
- Validates render payloads against `schema.json`
- Renders sandboxed Jinja2 templates
- Converts rendered HTML into PDF
- Caches generated PDFs by request hash
- Supports single renders and batch jobs
- Exposes liveness and readiness endpoints for operations

## Project Layout

Important paths:

- `app/` application code
- `templates/` template bundles
- `cache/` generated PDF files
- `tests/` automated tests

Each template bundle should contain:

- `template.html`
- `styles.css`
- `schema.json`
- `metadata.json`
- optional `partials/`
- optional `assets/`

## Prompt To Generate a Template from an HTML Design

Use this prompt when you want an LLM to convert a static HTML design file or HTML/CSS snippet into a valid template bundle for this app:

```text
You are converting an existing HTML design into a template bundle for a FastAPI PDF template engine.

Input:
- I will give you either:
  1. a full HTML design file, or
  2. an HTML snippet, or
  3. HTML + CSS code

Your task:
- Transform the design into a reusable template bundle for this system.
- Keep the visual structure and styling as close to the original design as possible.
- Replace hardcoded business content with Jinja2 template variables.
- Use loops for repeated items.
- Use conditions for optional sections.
- Split reusable header/footer sections into partials when appropriate.

Output format:
- Return these files:
  - template.html
  - styles.css
  - schema.json
  - metadata.json
  - optional partials/*.html if needed

Rules:
- This template will run inside a sandboxed Jinja2 environment.
- Do not use Python code, imports, custom runtime logic, or file access.
- Only use safe Jinja2 constructs:
  - {{ variable }}
  - {% for item in items %}
  - {% if condition %}
  - {% include "partials/file.html" %}
- Prefer dictionary-safe access patterns when helpful.
- Make the template generic and reusable, not tied to one company or one invoice.
- Keep all styling in styles.css where possible.
- Keep HTML semantic and clean.

Data modeling requirements:
- Infer a practical JSON payload structure from the design.
- Create a strict schema.json with:
  - type
  - required
  - properties
  - additionalProperties: false where appropriate
- Include arrays for repeated sections such as line items, table rows, benefits, features, or bullet blocks.
- Include optional fields for sections that may be hidden.

Metadata requirements:
- metadata.json must contain:
  - name
  - version
  - description

Template conversion expectations:
- Replace values like invoice number, name, dates, addresses, totals, descriptions, and branding with variables.
- Convert repeated cards/rows/list blocks into loops.
- Convert optional notes, subtitles, badges, terms, footers, and secondary panels into conditions.
- If the design has a repeating header or footer, move it into partials.

Return the final answer as:
1. Suggested template_id
2. Data contract summary
3. template.html
4. styles.css
5. schema.json
6. metadata.json
7. partial files if any

Example variable style:
- {{ data.invoice_number }}
- {{ data.customer.name }}
- {% for item in data["items"] %}
- {% if data.get("notes") %}

Wait for my HTML input and then generate the full template bundle.
```

## Start Locally

Create and activate the virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the API:

```bash
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The service will be available at:

```text
http://127.0.0.1:8000
```

Root documentation:

```text
http://127.0.0.1:8000/
```

Health endpoints:

```text
http://127.0.0.1:8000/health/live
http://127.0.0.1:8000/health/ready
```

## Start With Docker

Production-style container:

```bash
docker compose up api --build
```

For deployed environments, set multiple API keys as a comma-separated variable:

```bash
PDF_ENGINE_API_KEYS=key-one,key-two,key-three
```

## Run Tests

```bash
.venv/bin/python -m pytest
```

## Existing Template

The repository includes one sample template:

- `invoice_v1`

Inspect it here:

- [template.html](/Users/mac/projects/pdf-engine/templates/invoice_v1/template.html:1)
- [styles.css](/Users/mac/projects/pdf-engine/templates/invoice_v1/styles.css:1)
- [schema.json](/Users/mac/projects/pdf-engine/templates/invoice_v1/schema.json:1)
- [metadata.json](/Users/mac/projects/pdf-engine/templates/invoice_v1/metadata.json:1)

## API Endpoints

Available endpoints:

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

## Get Template Metadata

Example:

```bash
curl http://127.0.0.1:8000/templates/invoice_v1
```

This returns the template metadata and its JSON Schema.

## Health Checks

Liveness:

```bash
curl http://127.0.0.1:8000/health/live
```

Readiness:

```bash
curl http://127.0.0.1:8000/health/ready
```

Readiness verifies:

- template directory exists
- cache directory exists
- PDF runtime is available

## Render One PDF

Example request:

```bash
curl -X POST http://127.0.0.1:8000/render \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "invoice_v1",
    "data": {
      "invoice_number": "INV-100",
      "issue_date": "2026-04-29",
      "customer": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "items": [
        {
          "description": "Consulting",
          "quantity": 2,
          "unit_price": 100,
          "total": 200
        }
      ],
      "notes": "Thank you"
    },
    "branding": {
      "company_name": "Acme"
    },
    "settings": {
      "filename": "invoice.pdf"
    }
  }' --output invoice.pdf
```

If validation passes and rendering succeeds, the response body is the PDF file.

Response headers include:

- `X-Request-Hash`
- `X-Cache-Hit`
- `Content-Disposition`

## Render and Get Download URL

If you want JSON instead of inline PDF bytes:

```bash
curl -X POST http://127.0.0.1:8000/render \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "invoice_v1",
    "data": {
      "invoice_number": "INV-101",
      "issue_date": "2026-04-29",
      "customer": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "items": [
        {
          "description": "Consulting",
          "quantity": 1,
          "unit_price": 150,
          "total": 150
        }
      ]
    },
    "settings": {
      "filename": "invoice-url.pdf",
      "return_mode": "download_url"
    }
  }'
```

Example response:

```json
{
  "template_id": "invoice_v1",
  "cache_hit": false,
  "request_hash": "....",
  "filename": "invoice-url.pdf",
  "download_url": "/cache/{request_hash}.pdf"
}
```

The current service returns output URLs in this form:

```text
/output/{file_id}
```

## Render with template_object

You can send the template inline instead of storing it first:

```bash
curl -X POST http://127.0.0.1:8000/render \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_object": {
      "template_html": "<html><body><h1>{{ data.title }}</h1></body></html>",
      "styles_css": "body { font-family: sans-serif; }",
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title"],
        "properties": {
          "title": { "type": "string" }
        }
      },
      "metadata": {
        "name": "Inline Template",
        "version": "1.0.0"
      }
    },
    "data": {
      "title": "Inline PDF"
    },
    "settings": {
      "filename": "inline.pdf",
      "return_mode": "download_url"
    }
  }'
```

## Render in Batch

Submit a batch:

```bash
curl -X POST http://127.0.0.1:8000/render/batch \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "invoice_v1",
    "documents": [
      {
        "invoice_number": "INV-B1",
        "issue_date": "2026-04-29",
        "customer": {
          "name": "Jane Doe",
          "email": "jane@example.com"
        },
        "items": [
          {
            "description": "Consulting",
            "quantity": 1,
            "unit_price": 100,
            "total": 100
          }
        ]
      }
    ]
  }'
```

## Force Regenerate

To bypass the duplicate cache even when the same payload was already rendered:

```bash
curl -X POST http://127.0.0.1:8000/render \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "invoice_v1",
    "force_regenerate": true,
    "data": {
      "invoice_number": "INV-200",
      "issue_date": "2026-04-29",
      "customer": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "items": [
        {
          "description": "Consulting",
          "quantity": 2,
          "unit_price": 100,
          "total": 200
        }
      }
    }
  }'
```

This returns a `job_id`.

Check job status:

```bash
curl http://127.0.0.1:8000/jobs/{job_id}
```

## Create a New Template

You can register a new template bundle through the API:

```bash
curl -X POST http://127.0.0.1:8000/templates \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "simple_invoice",
    "template_html": "<html><body><h1>{{ data.title }}</h1></body></html>",
    "styles_css": "body { font-family: sans-serif; }",
    "schema": {
      "type": "object",
      "additionalProperties": false,
      "required": ["title"],
      "properties": {
        "title": { "type": "string" }
      }
    },
    "metadata": {
      "name": "Simple Invoice",
      "version": "1.0.0"
    },
    "partials": {}
  }'
```

This writes a new bundle under `templates/simple_invoice/`.

## Where PDFs Are Stored

Generated PDFs are written to:

- [cache](/Users/mac/projects/pdf-engine/cache:1)

Each file is named with the request hash:

```text
cache/{request_hash}.pdf
```

## How Caching Works

The cache key is based on:

- template id
- input data
- branding
- render settings

If the same request is sent again, the cached PDF is returned instead of rendering a new one.

Response headers for render requests include:

- `X-Request-Hash`
- `X-Cache-Hit`

## Common Errors

Validation error:

- Happens when required fields are missing or the payload shape does not match `schema.json`

Template error:

- Happens when template files are missing or Jinja rendering fails

PDF runtime error:

- Happens when WeasyPrint or its native libraries are unavailable

## Notes For macOS

Local PDF rendering depends on native libraries. This project has already been adjusted to load Homebrew libraries from `/opt/homebrew/lib` automatically on macOS.

If rendering breaks again, verify that these packages are installed:

```bash
brew install pango gdk-pixbuf libffi
```

## Production Position

What is already production-facing:

- sandboxed template execution
- schema validation before rendering
- deterministic PDF caching
- Docker production image
- health endpoints
- live root documentation

What is still future work for a more hardened deployment:

- authentication and authorization
- persistent external job storage
- queue workers outside the web process
- object storage for PDFs
- structured logging and metrics export
- rate limiting and audit trails

## Recommended Workflow

1. Start the API.
2. Inspect a template with `GET /templates/{template_id}`.
3. Send a valid `POST /render` request.
4. Save the PDF response or use `return_mode: "download_url"`.
5. Check `cache/` for generated files.
6. Use batch rendering only when you need multiple documents at once.
