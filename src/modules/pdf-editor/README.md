# pdf-editor

Place named text boxes and tables anywhere on a PDF or a scan, fill them in,
download the result. Mounted at `/app/pdf`.

This module is unusual enough in this codebase to be worth a page — it is a
canvas, not a form, and most of its rules come from somewhere outside this
repository.

## The one thing to know before changing anything here

**What the browser draws has to be exactly what the downloaded PDF contains** —
same glyphs, same font, same size, same baseline, same position. Not
approximately. A line that wraps after "Street" on screen and after "Main" in
the download is a bug, and the kind a customer finds in a batch of 400
invoices.

That holds for one reason: the maths that decides where every character goes
lives in `@pdf-slot/core`, and **the same code runs in two places** — here to
draw the preview, and in the generation service to write the PDF.

So:

- **Never compute a glyph position, a line break or a text measurement in this
  module.** Call core. If the function you want does not exist, add it there.
- `@pdf-slot/core` is pinned to **a commit**, not a range, in `package.json`.
  That is deliberate: a range would let this app and the service resolve to
  different versions while both looked correct.

`HANDOVER.md` in [`zubblehq/pdf-slot-api`](https://github.com/zubblehq/pdf-slot-api)
is the long version, and worth the two minutes before touching `components/canvas`
or `components/overlay`.

## Layout

```
api/persistence/   three stores behind one interface, chosen at runtime:
                   IndexedDB (today), HTTP (when a service is configured)
components/
  canvas/          the page, the rulers, zoom and pan. Paints to <canvas>
  overlay/         the text boxes themselves — drag, resize, type, caret
  table/           table geometry, handles, row and column edges
  panels/          the inspector, the slot list, shortcuts
  toolbar/         zoom, pages, download
  generate/        the bulk flow — unreachable today, see below
  upload/          the dropzone and file validation
  files/           saved files
  shared/          Hint and ScrollFade, used across the above
hooks/             editor state, history, the commit/render pipeline
lib/               pure helpers: file hashing, slot commands, reading order
constants/         environment and layout constants
pages/             pdf-editor-page (entry), template-editor-page, editor-page
routes/            pdf.route.tsx
```

## Things that will look wrong and are not

**Inline styles in `canvas/` and `overlay/`.** The styling rules say use
Tailwind classes. These cannot: a box's position is a number worked out at
runtime from the zoom level and the slot's coordinates in the PDF, and there is
no class for a computed number. The same reason your virtualised mail list and
custom scrollbar use `style={{ transform }}`.

**The ruler re-reads its colours on a theme change.** It is painted into a
`<canvas>`, which cannot say `var(--token)` and does not repaint itself when a
stylesheet changes. `use-theme-tokens.ts` subscribes to the class on `<html>`
for the same reason `src/modules/email` does, and says so.

**One bare `AlertDialog`.** The kit's `ConfirmDialog` is right for a
confirmation; `generate-template-dialog.tsx` is not one — both of its buttons
act, and dismissing it means "ask me again" rather than picking an option.
Every actual confirmation here uses `ResourceDeleteDialog`.

**Bulk generation is unreachable.** `generate/` is complete and switched off:
without `VITE_PDF_API_URL` the editor saves to IndexedDB and does not offer it.
The service behind it is single-tenant as it stands — every organisation would
see every other organisation's templates — so nothing should proxy to it until
[that issue](https://github.com/zubblehq/pdf-slot-api/issues/1) is closed.
Browser storage is a supported mode, not a stub.

## Tests

`tests/pdf-*.test.ts` at the repository root — 431 of them, about 35 seconds.

They use `@testing-library/react`, which `testing.md` excludes, and that was a
deliberate exception rather than an oversight. The maths is already extracted
into `core` and tested there; what is left to test is whether the *component*
still applies it — whether the box drawn on screen is where `toScreenPoint`
says it is. That failure is a component rendering the right numbers in the
wrong place, and no test of a function can see it.

`tests/pdf-public-fonts.test.ts` is the one most worth not deleting: it
compares the font files this app serves with the copies core renders from, byte
for byte. Two files with the same name and different bytes would both look like
Inter and break lines in different places.

## Fonts

`public/fonts/` holds five faces. They must stay byte-identical to the copies
inside `@pdf-slot/core` — the browser measures with what it fetched, the
service draws with what core embeds. Changing one means changing both, and the
procedure is in core's own `CLAUDE.md`.
