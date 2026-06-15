You are building a production-grade standalone PDF Generation Microservice using Python.

The system is NOT a SaaS. It is an internal infrastructure service used by other applications.

-----------------------------------
CORE OBJECTIVE
-----------------------------------
Build a universal PDF engine that:
- Accepts template + data via API
- Generates PDFs dynamically
- Supports batch generation
- Prevents duplicate rendering
- Allows user-created templates safely
- Runs as an isolated microservice

-----------------------------------
TECH STACK
-----------------------------------
- FastAPI (API layer)
- Jinja2 (templating engine)
- WeasyPrint (HTML → PDF)
- Pydantic (validation)
- Redis (cache + queue)
- Celery (async workers)
- PostgreSQL (metadata)
- MinIO/S3 (file storage)

-----------------------------------
SYSTEM RULES
-----------------------------------
- NO authentication system → only API key middleware
- NO billing logic
- NO multi-tenant complexity
- Every request is self-contained (no company_id)
- Templates must NOT execute Python code
- Must run in sandboxed environment

-----------------------------------
API DESIGN
-----------------------------------

POST /render
- Input:
  {
    template_id OR template_object,
    data,
    branding,
    settings,
    force_regenerate (optional)
  }
- Behavior:
  1. Generate request hash (template + data + settings)
  2. Check cache
  3. If exists → return cached PDF
  4. Else:
     - validate schema
     - render template
     - generate PDF
     - store result
     - return file or URL

-----------------------------------

POST /render/batch
- Input:
  {
    template_id,
    documents: [data1, data2, data3...]
  }
- Behavior:
  - Split into chunks
  - Dispatch Celery workers
  - Generate PDFs in parallel
  - Return job_id

-----------------------------------

GET /jobs/{job_id}
- Returns job status:
  pending / processing / completed / failed

-----------------------------------

GET /output/{file_id}
- Returns generated PDF (or signed URL)

-----------------------------------

POST /templates
- Stores new template
- Validate schema
- Store version

-----------------------------------

-----------------------------------
TEMPLATE SYSTEM
-----------------------------------

Template Structure:

templates/{template_id}/
  template.html
  styles.css
  schema.json
  metadata.json
  partials/
  assets/

-----------------------------------

Template Features:
- Variables: {{ variable }}
- Loops: {% for item in items %}
- Conditions: {% if condition %}
- Includes: {% include 'partials/header.html' %}

-----------------------------------

SCHEMA VALIDATION
-----------------------------------
- Each template has schema.json
- Validate incoming data strictly
- Reject invalid payloads before rendering

-----------------------------------

SECURITY MODEL
-----------------------------------
- Use Jinja2 SandboxedEnvironment
- Disallow:
  - imports
  - file access
  - system execution
- Whitelist variables only
- Limit execution time
- Sanitize HTML/CSS

-----------------------------------

DUPLICATE HANDLING
-----------------------------------
- Generate SHA256 hash from:
  template + data + branding + settings
- Store mapping:
  hash → output file
- If same request → return cached file
- Support:
  force_regenerate = true (bypass cache)

-----------------------------------

BATCH PROCESSING
-----------------------------------
- Split large jobs into chunks (100–500)
- Use Celery workers
- Retry failed items only
- Store outputs in batch folder
- Option to:
  - return ZIP
  - return multiple file URLs

-----------------------------------

STORAGE STRUCTURE
-----------------------------------

storage/
  cache/
  generated/
  batch/
  previews/
  temp/

-----------------------------------

RENDERING PIPELINE
-----------------------------------

1. Validate API Key
2. Parse request
3. Validate schema
4. Resolve template
5. Compile template (cached)
6. Inject data
7. Generate HTML
8. Convert to PDF (WeasyPrint)
9. Store output
10. Return response

-----------------------------------

PERFORMANCE OPTIMIZATION
-----------------------------------
- Cache compiled templates
- Cache rendered PDFs
- Async job queue
- Asset caching
- Template preloading

-----------------------------------

OUTPUT OPTIONS
-----------------------------------
- Direct PDF response
- File URL
- Batch ZIP
- Async job tracking

-----------------------------------

MONITORING
-----------------------------------
- Track:
  - render time
  - failures
  - cache hit rate
  - batch progress

-----------------------------------

CONSTRAINTS
-----------------------------------
- Do NOT couple templates with backend code
- Do NOT allow arbitrary execution
- Must scale horizontally
- Must support large batch generation
- Must be production-safe

-----------------------------------

OUTPUT EXPECTATION FROM YOU
-----------------------------------
Generate:

1. Full project folder structure
2. Core module breakdown
3. API route structure
4. Rendering pipeline design
5. Template loader design
6. Cache + hash logic
7. Batch processing design
8. Security implementation approach
9. Example request/response flows

Do NOT generate trivial code.
Focus on architecture and production design.
