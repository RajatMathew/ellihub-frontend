---
paths:
  - "**/*.tsx"
  - "**/*.css"
---

# Styling & Theming (Tailwind CSS v4)

## The golden rule

**All theme values — colors, radii, spacing, typography — live in `src/index.css`.** Components consume them through semantic Tailwind utilities (`bg-primary`, `text-muted-foreground`, `rounded-md`). Nothing that could change with a theme should be hard-coded in a component.

This is what makes switching light ↔ dark, or rebranding colors, a one-file change. Every hex in JSX breaks that promise.

## File layout

`src/index.css` has three logical sections, in this order:

1. **Imports** — `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`, `@fontsource-variable/geist`. Keep these at the top.
2. **`@theme inline { ... }`** — register design tokens (maps CSS vars to Tailwind utility names). Also defines font tokens, radii.
3. **`:root { ... }`** and **`.dark { ... }`** — the actual values for each token in light and dark mode.

Dark mode is toggled via `next-themes` (the `.dark` class is applied to `<html>`). Do not write `dark:` variants against hard-coded colors.

## Adding or changing a color

1. Add the CSS variable to **both** `:root` and `.dark` in `index.css`. Never one without the other.
2. Register it in the `@theme inline` block (e.g. `--color-success: var(--success);`) so Tailwind exposes `bg-success`, `text-success`, etc.
3. Use the semantic utility in components: `<Badge className="bg-success text-success-foreground" />`.
4. Never bypass this with `bg-[#22c55e]`, `style={{ color: "#22c55e" }}`, or a raw hex in a CSS file.

## Parity rule (light ↔ dark)

Every token defined under `:root` **must** have a counterpart under `.dark`, and vice versa.

## Radii and spacing

- Use the design system's `--radius` scale: `rounded-sm`, `rounded-md`, `rounded-lg`.
- Spacing uses Tailwind's default scale (`p-2`, `gap-4`, etc.). Do not use arbitrary pixel values (`w-[347px]`).

## `cn()` and conditional classes

- Use `cn()` from `@/lib/utils` (clsx + tailwind-merge) for conditional class merging.
- Wrap shadcn customizations in `cn()`.

## What NOT to do

- ❌ Arbitrary color values: `bg-[#ff0000]`, `text-[#333]`, `style={{ color: "#ef4444" }}`.
- ❌ Hard-coded hex in CSS files (outside `index.css`).
- ❌ `dark:` variants against literal colors (`dark:bg-[#000]`).
- ❌ Inline styles (`style={{}}`) for anything the design system covers.
- ❌ Arbitrary pixel values (`w-[347px]`) — use the spacing scale.
- ❌ Adding a `tailwind.config.js` — Tailwind v4 is CSS-first in this repo.
