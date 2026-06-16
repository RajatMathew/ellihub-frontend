---
name: scribe-scraper-mcp
description: Use the hosted Scribe Scraper MCP server to convert public Scribe guides into Markdown, optionally saving downloaded screenshots with click-target annotations.
---

# Scribe Scraper MCP

Use this skill when the user asks to scrape, export, convert, archive, save, or transform a Scribe guide/page/viewer URL into Markdown. Also use it when the user wants screenshots from Scribe included in a Markdown export.

## MCP Server

Hosted MCP endpoint:

```text
https://scribe-scraper-mcp.onrender.com/mcp/
```

Tool:

```text
scrape_scribe_to_markdown
```

Arguments:

```json
{
  "url": "https://scribehow.com/...",
  "include_images": true,
  "annotate_click_targets": true,
  "use_cache": false
}
```

Always include `"use_cache": false` in tool payloads for user-requested exports. Do not omit it.

Return shape:

```json
{
  "title": "Guide title",
  "source_url": "https://scribehow.com/...",
  "step_count": 22,
  "image_count": 21,
  "markdown": "# Guide title\n...",
  "images": [
    {
      "filename": "step-03.jpeg",
      "path": "scribe-assets/step-03.jpeg",
      "content_type": "image/jpeg",
      "base64": "..."
    }
  ]
}
```

## Agent Workflow

1. Detect the Scribe URL from the user request.
2. Always use the hosted MCP endpoint for user-requested Scribe exports:

   ```text
   https://scribe-scraper-mcp.onrender.com/mcp/
   ```

   Keep local README/CLI documentation separate from this user-export workflow. Local files such as `scrape_scribe.py`, `server.py`, and implementation docs are for developing or debugging the scraper, not for fulfilling ordinary user export requests.

3. Check whether the hosted MCP server is already installed:

   ```sh
   codex mcp get scribe-scraper
   ```

4. If missing or pointed elsewhere, install the hosted endpoint:

   ```sh
   codex mcp add scribe-scraper --url https://scribe-scraper-mcp.onrender.com/mcp/
   ```

   The trailing slash after `/mcp/` is required for Codex CLI compatibility.

5. Prefer calling the hosted MCP tool directly if the current agent session exposes it.
6. If the MCP tool is not exposed in the current session, call the hosted endpoint via `codex exec` or a minimal MCP client.
7. Do not use `scrape_scribe.py`, the local FastMCP server, or any local implementation as a fallback unless the user explicitly asks to develop, test, or debug the scraper implementation.
8. Always send `"use_cache": false` in the tool payload for user-requested exports, even though it is the server default.
9. Save the returned Markdown to the user-requested path. If no path is requested, create a safe slug from the Scribe title and write `<slug>.md`.
10. If `include_images=true`, decode each returned `images[].base64` value and write it to `images[].path` relative to the Markdown file's directory. The Markdown already references those paths.
11. Report the output Markdown path, image count, step count, and any skipped/failed image writes.

## Forbidden Fallbacks

- Do not run `python scrape_scribe.py ...` for user-requested exports.
- Do not start `server.py` locally for user-requested exports.
- Do not treat existing local output files as fresh exports unless the user explicitly asks to reuse cached output.
- Use local implementation tooling only when the user explicitly asks to develop, test, or debug the scraper itself.

## Defaults

Use these defaults unless the user says otherwise:

```json
{
  "include_images": true,
  "annotate_click_targets": true,
  "use_cache": false
}
```

Keep `use_cache=false` by default. Use `use_cache=true` only when the user explicitly wants repeat exports of the same unchanged Scribe to be faster and accepts stale click coordinates if the guide changes at the same URL.

For ordinary user-requested exports, always send `use_cache=false` explicitly. Do not rely on server defaults, and do not set `use_cache=true` unless the user explicitly asks to use cached click-target coordinates.

Use `include_images=false` only when:

- the user asks for text-only Markdown,
- the user asks for speed over screenshots,
- the MCP image payload is too large for the current context,
- or the first image-inclusive run times out and a partial text result is better than failing.

Use `annotate_click_targets=false` only when:

- the user asks for raw screenshots,
- click ring placement appears incorrect,
- or click-target extraction is timing out.

## Saving Assets

When saving a full export:

1. Create an assets directory beside the Markdown file. Prefer the directory already used by returned image paths, usually `scribe-assets/`.
2. Decode base64 using a binary-safe method.
3. Write exact filenames from `images[].filename` or exact relative paths from `images[].path`.
4. Do not rewrite Markdown image links unless you intentionally changed the asset directory.

Python example for decoding:

```python
import base64
from pathlib import Path

asset_path = output_dir / image["path"]
asset_path.parent.mkdir(parents=True, exist_ok=True)
asset_path.write_bytes(base64.b64decode(image["base64"]))
```

## Performance Expectations

- Text-only export is usually fast.
- Image exports with click-target annotations normally use Scribe's public actions API for coordinates.
- Repeat exports of the same URL can be faster with `use_cache=true`, but cache is disabled by default so changed Scribes at the same link export fresh coordinates.
- If the API shape changes, the server falls back to browser-rendered DOM extraction, which is slower.
- If the user needs a quick result, first call with `include_images=false`, then offer an image-inclusive run.
- When reporting duration, report only the hosted MCP tool call duration.
- Do not include MCP install/config checks, file writing, image decoding, or verification time in the reported duration unless the user explicitly asks for end-to-end timing.

## Verification

After a full export, verify:

- Markdown file exists.
- Step count in the MCP response is nonzero.
- If `include_images=true`, image count is nonzero and image files exist on disk.
- At least one Markdown image link points to an existing file.

For a quick health check:

```sh
curl -fsS https://scribe-scraper-mcp.onrender.com/healthz
```

Expected:

```json
{"ok":true,"service":"scribe-scraper"}
```

## Failure Handling

If `codex mcp add` fails, tell the user Codex CLI is required and provide the command that failed.

If the MCP endpoint is asleep or slow, call `/healthz` once, then retry the tool call.

If the MCP server returns Markdown but no images, still save the Markdown and report that images were not returned.

If image-inclusive mode times out, retry with:

```json
{
  "include_images": false
}
```

Then report that text export succeeded and image export timed out.
