```md
You are building a Python-based PDF Template Engine using FastAPI + Jinja2.

Goal:
Design a system where users can create PDF templates safely without modifying backend code.

Requirements:

1. Template System
- Templates stored as:
  templates/{template_id}/
    - template.html
    - styles.css
    - schema.json
    - metadata.json
    - partials/
    - assets/
- Use Jinja2 for rendering

2. Template Features
- Support placeholders: {{ variable }}
- Support loops: {% for item in items %}
- Support conditions: {% if condition %}
- Support partial includes

3. User Template Creation
- Provide:
  - Safe HTML editor OR structured template input
- Restrict:
  - No Python code
  - No imports
  - No file/system access

4. Schema Validation
- Each template has schema.json
- Validate input data before rendering
- Reject invalid payloads

5. Security
- Use Jinja2 SandboxedEnvironment
- Whitelist variables only
- Limit execution time and memory

6. Rendering Flow
- Load template
- Validate schema
- Inject data
- Render HTML
- Convert to PDF (WeasyPrint)

7. Duplicate Handling
- Generate request hash:
  hash(template + data + branding + settings)
- If exists → return cached PDF
- Else → generate and store

8. API Design
- POST /render
- POST /render/batch
- GET /templates/{id}
- POST /templates

9. Performance
- Precompile templates
- Cache compiled templates
- Use async workers for batch jobs

10. Output
- Return:
  - PDF file OR
  - Download URL OR
  - Job ID

Constraints:
- Do NOT allow template execution outside sandbox
- Keep templates decoupled from backend logic
- Ensure templates are reusable and versioned

Output:
- Folder structure
- Core modules design
- Rendering pipeline
- Security approach
```
