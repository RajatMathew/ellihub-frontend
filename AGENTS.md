# Repository Guidelines

## Project Structure & Module Organization
This repository is currently scaffold-level. The only committed artifact is [prompt.md](/Users/mac/projects/pdf-engine/prompt.md), which defines a Python PDF template engine built with FastAPI, Jinja2, and WeasyPrint.

Use that spec as the baseline structure:
- `app/` for API, rendering, validation, and cache modules
- `templates/{template_id}/` for user-managed template bundles
- `tests/` for unit and integration coverage
- `assets/` for shared static files if repository-level assets are introduced

Each template bundle should contain `template.html`, `styles.css`, `schema.json`, `metadata.json`, plus optional `partials/` and `assets/`.

## Build, Test, and Development Commands
No build system is committed yet. When bootstrapping the project, prefer a standard Python workflow and keep commands documented in `README.md`.

Expected commands:
- `python -m venv .venv` creates the local virtual environment
- `source .venv/bin/activate` activates the environment
- `pip install -r requirements.txt` installs app dependencies
- `uvicorn app.main:app --reload` runs the FastAPI server locally
- `pytest` runs the test suite

If you introduce `Makefile`, `just`, or task-runner commands, keep them thin wrappers around the commands above.

## Coding Style & Naming Conventions
Target Python 3 with 4-space indentation and type hints on public functions. Use `snake_case` for modules, functions, and variables, `PascalCase` for classes, and lowercase directory names for template IDs such as `templates/invoice_v1/`.

Prefer small modules with single responsibilities: API routing, schema validation, sandboxed rendering, PDF generation, and cache storage should remain separate.

## Testing Guidelines
Use `pytest` for all new tests. Mirror the application layout under `tests/`, and name files `test_<module>.py`. Add unit tests for schema validation, sandbox restrictions, and request-hash caching, plus integration tests for `/render` and `/render/batch`.

## Commit & Pull Request Guidelines
There is no Git history in this workspace yet, so adopt concise imperative commits such as `Add sandboxed template loader`. Keep pull requests focused and include:
- a short summary of behavior changes
- linked issue or task reference, if available
- sample request/response payloads for API changes
- rendered PDF screenshots only when output formatting changes

## Security & Configuration Tips
Do not allow template code to escape Jinja2 sandboxing. Never commit secrets, generated PDFs, or local virtual environments. Keep `.env`, cache directories, and runtime artifacts ignored once those files are introduced.
