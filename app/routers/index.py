from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, JSONResponse

from app.core.config import settings
from app.services.pdf_service import CSS, HTML

router = APIRouter(tags=["index"])


@router.get("/", response_class=HTMLResponse)
async def index() -> str:
    return """
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PDF Engine | Production Guide</title>
    <style>
      :root {
        --sand: #ede4d6;
        --paper: #faf6ef;
        --panel: rgba(255, 251, 244, 0.84);
        --ink: #161311;
        --muted: #675f57;
        --line: rgba(92, 74, 58, 0.18);
        --rust: #a04325;
        --rust-soft: rgba(160, 67, 37, 0.12);
        --forest: #1f5b48;
        --forest-soft: rgba(31, 91, 72, 0.12);
        --night: #211c18;
        --code: #1f1b19;
        --glow: 0 24px 70px rgba(35, 25, 18, 0.11);
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        color: var(--ink);
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at 0% 0%, rgba(160, 67, 37, 0.14), transparent 24%),
          radial-gradient(circle at 100% 10%, rgba(31, 91, 72, 0.14), transparent 26%),
          linear-gradient(180deg, #f9f5ee 0%, var(--paper) 48%, #f2eadf 100%);
      }

      a {
        color: var(--rust);
        text-decoration: none;
      }

      code {
        background: #efe5d8;
        border: 1px solid rgba(92, 74, 58, 0.08);
        border-radius: 7px;
        padding: 0.1rem 0.38rem;
        font-family: "SFMono-Regular", Menlo, Consolas, monospace;
        font-size: 0.93em;
      }

      pre {
        margin: 1rem 0 1.5rem;
        padding: 1.1rem 1.2rem;
        overflow-x: auto;
        border-radius: 18px;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)),
          var(--code);
        color: #f7f2ea;
        font-family: "SFMono-Regular", Menlo, Consolas, monospace;
        font-size: 0.92rem;
        line-height: 1.6;
      }

      .shell {
        max-width: 1220px;
        margin: 0 auto;
        padding: 28px 18px 72px;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
        padding: 10px 14px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255, 251, 244, 0.66);
        backdrop-filter: blur(14px);
      }

      .brand {
        font-size: 0.92rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .status-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .pill {
        border-radius: 999px;
        padding: 0.52rem 0.8rem;
        font-size: 0.84rem;
        border: 1px solid transparent;
      }

      .pill.rust {
        color: var(--rust);
        background: var(--rust-soft);
        border-color: rgba(160, 67, 37, 0.18);
      }

      .pill.forest {
        color: var(--forest);
        background: var(--forest-soft);
        border-color: rgba(31, 91, 72, 0.18);
      }

      .hero {
        display: grid;
        grid-template-columns: 1.4fr 0.9fr;
        gap: 22px;
        align-items: stretch;
      }

      .hero-main,
      .hero-side,
      .panel {
        border: 1px solid var(--line);
        border-radius: 28px;
        background: var(--panel);
        backdrop-filter: blur(16px);
        box-shadow: var(--glow);
      }

      .hero-main {
        padding: 34px 30px 30px;
        position: relative;
        overflow: hidden;
      }

      .hero-main::after {
        content: "";
        position: absolute;
        inset: auto -8% -32% auto;
        width: 280px;
        height: 280px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(160, 67, 37, 0.16), transparent 70%);
      }

      .hero-side {
        padding: 24px;
      }

      .eyebrow {
        display: inline-block;
        padding: 0.4rem 0.65rem;
        border-radius: 999px;
        font-size: 0.76rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--rust);
        background: var(--rust-soft);
      }

      h1, h2, h3 {
        line-height: 1.1;
      }

      h1 {
        margin: 14px 0 14px;
        font-size: clamp(2.7rem, 5vw, 5rem);
        max-width: 12ch;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 1.7rem;
      }

      h3 {
        margin: 0 0 10px;
        font-size: 1.1rem;
      }

      p {
        margin: 0 0 1rem;
      }

      .lede {
        max-width: 62ch;
        color: var(--muted);
        font-size: 1.06rem;
      }

      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 24px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.85rem 1.05rem;
        border-radius: 999px;
        border: 1px solid var(--line);
        font-weight: 700;
        background: rgba(255,255,255,0.72);
      }

      .button.primary {
        color: #fffaf4;
        background: linear-gradient(135deg, #9f3a22, #c15d31);
        border-color: rgba(159, 58, 34, 0.45);
      }

      .hero-list {
        margin: 0;
        padding-left: 20px;
      }

      .hero-list li {
        margin-bottom: 10px;
        color: var(--muted);
      }

      .stat-grid,
      .doc-grid,
      .ops-grid {
        display: grid;
        gap: 18px;
      }

      .stat-grid {
        margin-top: 24px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }

      .doc-grid {
        margin-top: 22px;
        grid-template-columns: 260px 1fr;
      }

      .ops-grid {
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }

      .card,
      .toc,
      .content {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--panel);
        box-shadow: var(--glow);
      }

      .card {
        padding: 20px;
      }

      .stat-value {
        font-size: 1.8rem;
        margin-bottom: 4px;
      }

      .muted {
        color: var(--muted);
      }

      .toc {
        position: sticky;
        top: 16px;
        align-self: start;
        padding: 22px 20px;
      }

      .toc ul {
        margin: 0;
        padding-left: 18px;
      }

      .toc li {
        margin-bottom: 10px;
      }

      .content {
        padding: 28px;
      }

      .section {
        padding: 22px 0;
        border-bottom: 1px solid rgba(92, 74, 58, 0.11);
      }

      .section:last-child {
        border-bottom: 0;
      }

      .section ul,
      .section ol {
        padding-left: 20px;
      }

      .section li {
        margin-bottom: 8px;
      }

      .label {
        display: inline-block;
        margin-bottom: 8px;
        color: var(--forest);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.75rem;
      }

      .banner {
        margin-top: 26px;
        padding: 18px 20px;
        border-left: 4px solid var(--forest);
        border-radius: 16px;
        background: rgba(31, 91, 72, 0.08);
      }

      .foot {
        margin-top: 24px;
        color: var(--muted);
        font-size: 0.95rem;
      }

      @media (max-width: 980px) {
        .hero,
        .doc-grid {
          grid-template-columns: 1fr;
        }

        .toc {
          position: static;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="topbar">
        <div class="brand">PDF Engine / Root Documentation</div>
        <div class="status-row">
          <span class="pill rust">Sandboxed Templates</span>
          <span class="pill forest">Production-Facing Runtime</span>
          <span class="pill rust">Hash-Based Cache</span>
        </div>
      </div>

      <section class="hero">
        <article class="hero-main">
          <span class="eyebrow">Advanced Capable</span>
          <h1>Production Guide for the Entire App</h1>
          <p class="lede">
            This service is a filesystem-backed PDF rendering API built with FastAPI, sandboxed
            Jinja2, JSON Schema validation, WeasyPrint PDF generation, and request-hash caching.
            The root page documents the live system, not just the codebase.
          </p>
          <div class="hero-actions">
            <a class="button primary" href="#quickstart">Quickstart</a>
            <a class="button" href="#operations">Operations</a>
            <a class="button" href="/docs">OpenAPI Docs</a>
            <a class="button" href="/health/ready">Readiness</a>
          </div>
          <div class="stat-grid">
            <div class="card">
              <div class="stat-value">6</div>
              <div>Primary API routes</div>
            </div>
            <div class="card">
              <div class="stat-value">2</div>
              <div>Health endpoints</div>
            </div>
            <div class="card">
              <div class="stat-value">API Key</div>
              <div><code>X-API-Key: local-dev-key</code></div>
            </div>
          </div>
        </article>

        <aside class="hero-side">
          <h2>Production Signals</h2>
          <ul class="hero-list">
            <li>Sandboxed template rendering with no Python execution path</li>
            <li>Schema validation before render execution</li>
            <li>Deterministic cache keys for repeatable output reuse</li>
            <li>Docker targets for development and production runtime</li>
            <li>Live root documentation and machine-friendly health probes</li>
          </ul>
          <div class="banner">
            <strong>Current scope:</strong> production-facing MVP.
            It is suitable for controlled deployment, but long-term queueing, persistent job
            storage, auth, and external object storage are still future work.
          </div>
        </aside>
      </section>

      <section class="doc-grid" style="margin-top: 22px;">
        <nav class="toc">
          <h3>Index</h3>
          <ul>
            <li><a href="#overview">System Overview</a></li>
            <li><a href="#quickstart">Quickstart</a></li>
            <li><a href="#docker">Docker</a></li>
            <li><a href="#architecture">Architecture</a></li>
            <li><a href="#templates">Template Contract</a></li>
            <li><a href="#template-prompt">Template Generation Prompt</a></li>
            <li><a href="#api">API Surface</a></li>
            <li><a href="#examples">Examples</a></li>
            <li><a href="#operations">Operations</a></li>
            <li><a href="#security">Security</a></li>
            <li><a href="#caching">Caching</a></li>
            <li><a href="#files">Generated Files</a></li>
            <li><a href="#troubleshooting">Troubleshooting</a></li>
          </ul>
        </nav>

        <article class="content">
          <section class="section" id="overview">
            <span class="label">Overview</span>
            <h2>System Overview</h2>
            <p>
              The app accepts structured render requests, validates them against a template-local
              JSON Schema, renders HTML with a sandboxed Jinja2 environment, converts that HTML to
              PDF with WeasyPrint, and stores the resulting bytes under a deterministic request hash.
            </p>
            <div class="ops-grid">
              <div class="card">
                <h3>Input Layer</h3>
                <p class="muted">FastAPI + Pydantic request validation.</p>
              </div>
              <div class="card">
                <h3>Template Layer</h3>
                <p class="muted">Filesystem template bundles with metadata, schema, partials, and assets.</p>
              </div>
              <div class="card">
                <h3>Render Layer</h3>
                <p class="muted">Sandboxed Jinja2 + WeasyPrint HTML-to-PDF conversion.</p>
              </div>
              <div class="card">
                <h3>Cache Layer</h3>
                <p class="muted">Hash-addressed PDF storage in <code>cache/</code>.</p>
              </div>
            </div>
          </section>

          <section class="section" id="quickstart">
            <span class="label">Quickstart</span>
            <h2>Run Locally</h2>
            <pre>python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000</pre>
            <p>Service URL: <code>http://127.0.0.1:8000</code></p>
            <p>OpenAPI docs: <code>/docs</code></p>
            <p>Root documentation: <code>/</code></p>
            <p>Default local auth header: <code>X-API-Key: local-dev-key</code></p>
          </section>

          <section class="section" id="docker">
            <span class="label">Deployment</span>
            <h2>Docker Workflows</h2>
            <h3>Production runtime</h3>
            <pre>docker compose up api --build</pre>
            <p class="muted">
              The production image includes the native runtime dependencies required by WeasyPrint. The Compose service exposes port 8000 internally for Dokploy routing and persists runtime files in a named volume.
            </p>
          </section>

          <section class="section" id="architecture">
            <span class="label">Architecture</span>
            <h2>Application Structure</h2>
            <ul>
              <li><code>app/routers/</code> HTTP routes and health/documentation entrypoints</li>
              <li><code>app/services/template_service.py</code> template bundle management and Jinja rendering</li>
              <li><code>app/services/schema_service.py</code> JSON Schema validation and payload limits</li>
              <li><code>app/services/pdf_service.py</code> WeasyPrint runtime integration</li>
              <li><code>app/services/cache_service.py</code> request hashing and PDF file persistence</li>
              <li><code>app/services/render_service.py</code> render orchestration and batch jobs</li>
            </ul>
          </section>

          <section class="section" id="templates">
            <span class="label">Templates</span>
            <h2>Template Contract</h2>
            <pre>templates/{template_id}/
  template.html
  styles.css
  schema.json
  metadata.json
  partials/
  assets/</pre>
            <p>Supported template features:</p>
            <ul>
              <li>Variables with <code>{{ variable }}</code></li>
              <li>Loops with <code>{% for item in items %}</code></li>
              <li>Conditions with <code>{% if condition %}</code></li>
              <li>Partial includes</li>
            </ul>
          </section>

          <section class="section" id="template-prompt">
            <span class="label">Prompt</span>
            <h2>Prompt to Generate a Template from an HTML Design</h2>
            <p>
              Use this prompt when you want an LLM or design assistant to convert an existing
              HTML design file, HTML snippet, or static invoice page into a valid template bundle
              for this app.
            </p>
            <pre>You are converting an existing HTML design into a template bundle for a FastAPI PDF template engine.

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

Wait for my HTML input and then generate the full template bundle.</pre>
          </section>

          <section class="section" id="api">
            <span class="label">API</span>
            <h2>API Surface</h2>
            <ul>
              <li><code>GET /</code> advanced documentation index</li>
              <li><code>GET /docs</code> Swagger/OpenAPI UI</li>
              <li><code>GET /health/live</code> liveness probe</li>
              <li><code>GET /health/ready</code> readiness probe</li>
              <li><code>GET /templates/{template_id}</code> inspect a template bundle</li>
              <li><code>POST /templates</code> create a new template bundle</li>
              <li><code>POST /render</code> render one PDF or download URL response from <code>template_id</code> or <code>template_object</code></li>
              <li><code>POST /render/batch</code> queue a batch render request</li>
              <li><code>GET /jobs/{job_id}</code> poll batch job status</li>
              <li><code>GET /output/{file_id}</code> retrieve generated output</li>
            </ul>
          </section>

          <section class="section" id="examples">
            <span class="label">Examples</span>
            <h2>Practical Request Examples</h2>
            <h3>Inspect a template</h3>
            <pre>curl http://127.0.0.1:8000/templates/invoice_v1</pre>
            <h3>Render a PDF</h3>
            <pre>curl -X POST http://127.0.0.1:8000/render \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "invoice_v1",
    "data": {
      "invoice_number": "INV-100",
      "issue_date": "2026-04-29",
      "customer": { "name": "Jane Doe", "email": "jane@example.com" },
      "items": [
        { "description": "Consulting", "quantity": 2, "unit_price": 100, "total": 200 }
      ],
      "notes": "Thank you"
    },
    "branding": { "company_name": "Acme" },
    "settings": { "filename": "invoice.pdf" }
  }' --output invoice.pdf</pre>
            <h3>Return JSON with a download URL</h3>
            <pre>curl -X POST http://127.0.0.1:8000/render \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "invoice_v1",
    "data": {
      "invoice_number": "INV-101",
      "issue_date": "2026-04-29",
      "customer": { "name": "Jane Doe", "email": "jane@example.com" },
      "items": [
        { "description": "Consulting", "quantity": 1, "unit_price": 150, "total": 150 }
      ]
    },
    "settings": { "filename": "invoice-url.pdf", "return_mode": "download_url" }
  }'</pre>
            <h3>Render an inline template_object</h3>
            <pre>curl -X POST http://127.0.0.1:8000/render \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_object": {
      "template_html": "&lt;html&gt;&lt;body&gt;&lt;h1&gt;{{ data.title }}&lt;/h1&gt;&lt;/body&gt;&lt;/html&gt;",
      "styles_css": "body { font-family: sans-serif; }",
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title"],
        "properties": {
          "title": { "type": "string" }
        }
      },
      "metadata": { "name": "Inline Template", "version": "1.0.0" }
    },
    "data": { "title": "Inline PDF" },
    "settings": { "filename": "inline.pdf", "return_mode": "download_url" }
  }'</pre>
            <h3>Queue a batch</h3>
            <pre>curl -X POST http://127.0.0.1:8000/render/batch \
  -H 'X-API-Key: local-dev-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "template_id": "invoice_v1",
    "documents": [
      {
        "invoice_number": "INV-B1",
        "issue_date": "2026-04-29",
        "customer": { "name": "Jane Doe", "email": "jane@example.com" },
        "items": [
          { "description": "Consulting", "quantity": 1, "unit_price": 100, "total": 100 }
        ]
      }
    ]
  }'</pre>
          </section>

          <section class="section" id="operations">
            <span class="label">Operations</span>
            <h2>Operational Guidance</h2>
            <div class="ops-grid">
              <div class="card">
                <h3>Health Checks</h3>
                <pre>curl http://127.0.0.1:8000/health/live
curl http://127.0.0.1:8000/health/ready</pre>
              </div>
              <div class="card">
                <h3>Auth Header</h3>
                <pre>X-API-Key: local-dev-key</pre>
              </div>
              <div class="card">
                <h3>Tests</h3>
                <pre>.venv/bin/python -m pytest</pre>
              </div>
              <div class="card">
                <h3>Cache Location</h3>
                <pre>cache/{request_hash}.pdf</pre>
              </div>
            </div>
            <p>
              Readiness confirms that template and cache directories exist and that the PDF runtime
              is available. Liveness reports whether the process is up.
            </p>
          </section>

          <section class="section" id="security">
            <span class="label">Security</span>
            <h2>Security Posture</h2>
            <ul>
              <li>Jinja2 uses <code>SandboxedEnvironment</code></li>
              <li>Template globals, filters, and tests are cleared</li>
              <li>Payloads are schema-validated before render execution</li>
              <li>Payload size and batch size are bounded in configuration</li>
              <li>Templates remain decoupled from backend code paths</li>
            </ul>
            <p class="muted">
              Still recommended for a fuller production rollout: authentication, audit logging,
              object storage, persistent job storage, and external queueing.
            </p>
          </section>

          <section class="section" id="caching">
            <span class="label">Caching</span>
            <h2>How Caching Works</h2>
            <p>The cache key is computed from:</p>
            <ul>
              <li>template id</li>
              <li>payload data</li>
              <li>branding payload</li>
              <li>render settings</li>
            </ul>
            <p>
              Identical requests reuse the same cached PDF. Response headers include
              <code>X-Request-Hash</code> and <code>X-Cache-Hit</code>.
            </p>
          </section>

          <section class="section" id="files">
            <span class="label">Artifacts</span>
            <h2>Generated Files</h2>
            <p>PDFs are written to the local cache directory:</p>
            <pre>cache/{request_hash}.pdf</pre>
            <p>They are also accessible through the mounted static route:</p>
            <pre>/cache/{request_hash}.pdf</pre>
          </section>

          <section class="section" id="troubleshooting">
            <span class="label">Troubleshooting</span>
            <h2>Common Errors</h2>
            <ul>
              <li>Validation failures mean the input did not match <code>schema.json</code></li>
              <li>Template errors usually mean missing files or invalid Jinja expressions</li>
              <li>Readiness failures often point to PDF runtime or filesystem issues</li>
            </ul>
            <h3>macOS native dependency note</h3>
            <pre>brew install pango gdk-pixbuf libffi</pre>
          </section>

          <p class="foot">
            This root page is the live operational guide for the running service. For filesystem-side
            repository docs, see <code>README.md</code> and <code>index.md</code>.
          </p>
        </article>
      </section>
    </main>
  </body>
</html>
"""


@router.get("/health/live")
async def health_live() -> JSONResponse:
    return JSONResponse({"status": "live"})


@router.get("/health/ready")
async def health_ready() -> JSONResponse:
    checks = {
        "templates_dir_exists": settings.templates_dir.exists(),
        "cache_dir_exists": settings.cache_dir.exists(),
        "pdf_runtime_available": HTML is not None and CSS is not None,
    }
    is_ready = all(checks.values())
    return JSONResponse(
        {
            "status": "ready" if is_ready else "degraded",
            "checks": checks,
            "templates_dir": str(Path(settings.templates_dir)),
            "cache_dir": str(Path(settings.cache_dir)),
        },
        status_code=200 if is_ready else 503,
    )
