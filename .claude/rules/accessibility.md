---
paths:
  - "**/*.tsx"
---

# Accessibility

Every interactive UI must be usable by keyboard and screen reader. The shadcn/Radix primitives handle most of this for free — don't defeat them with custom wrappers.

## Semantic HTML first

- Use real `<button>`, `<a>`, `<input>`, `<label>`, `<form>`, `<nav>`, `<main>` etc. Do not replace them with `<div onClick>`.
- A clickable element that navigates is an `<a>` / `<Link>`. A clickable element that performs an action is a `<button>`. Don't cross the two.
- Headings (`<h1>` – `<h6>`) must reflect document hierarchy, not visual size. Use Tailwind text utilities for size.

## Forms

- Every `<input>`, `<select>`, `<textarea>` must have a label. Prefer `<Label htmlFor="...">` + matching input `id`.
- Error messages must be rendered, not just announced by color change.
- Required fields: mark with both the `required` attribute and a visible indicator.

## Radix / shadcn primitives

- Dialogs, popovers, dropdown menus, and tooltips from Radix already handle focus trapping, `Escape` to close, `aria-*` wiring, and return-focus. **Do not build these from scratch.**
- Every `<Dialog>` must have a `<DialogTitle>`.
- Icon-only buttons need an accessible name: either `aria-label="..."` or `<span className="sr-only">...</span>`.

## Keyboard

- All interactive elements must be reachable by `Tab` and operable with `Enter` / `Space`.
- Do not set `tabIndex={-1}` on interactive elements unless you have a specific focus-management reason.

## Color & state

- Never use color as the sole signal for state. Pair red/green with an icon or text label.
- Use semantic tokens (`bg-destructive`, `text-muted-foreground`), not hard-coded colors.

## Images and media

- `<img>` needs `alt=""` for decorative, or descriptive `alt` for content.
