---
paths:
  - "**/*.tsx"
  - "**/*.css"
---

# Styling & Theming (Tailwind CSS v4)

## The golden rule

**All theme values — colors, radii, spacing, typography — live in `src/app/styles/`.** Components consume them through semantic Tailwind utilities (`bg-primary`, `text-muted-foreground`, `rounded-md`). Nothing that could change with a theme should be hard-coded in a component.

This is what makes switching light ↔ dark, or rebranding colors, a one-file change. Every hex in JSX breaks that promise.

## File layout

| File | Role |
| --- | --- |
| `src/main.css` | imported by `src/main.tsx`; `@import 'tailwindcss'` plus a couple of PWA keyframes. Not the token file. |
| `src/app/styles/globals.css` | imported by `src/app/index.tsx` (and `src/core/help`). Imports Tailwind, `tw-animate-css` and `./theme.css`, declares `@custom-variant dark`, and holds the `@theme inline { ... }` block that maps CSS vars to Tailwind utility names. |
| `src/app/styles/theme.css` | imports the four theme files below. |
| `src/app/styles/themes/*.css` | the actual token values: `light.css`, `editorial.css`, `dark.css`, `dark-blue.css`. |
| `src/app/styles/components/*.css` | third-party widget overrides (leaflet, apexcharts, …). Do not put app tokens here. |

There are **four** themes, not two. The dark variant is declared as
`@custom-variant dark (&:is(.dark *, .dark-blue *))`, so a `dark:` utility applies under both dark
themes. Themes are switched by `next-themes` (class on `<html>`); the registry, `THEME_VALUES` and
the `VITE_ENABLE_THEME_SWITCHER` flag live in `src/app/theme/theme-registry.ts`.

## Adding or changing a color

1. Add the CSS variable to **every** theme file under `src/app/styles/themes/`. Never one without the others.
2. Register it in the `@theme inline` block in `globals.css` (e.g. `--color-success: var(--success);`) so Tailwind exposes `bg-success`, `text-success`, etc.
3. Use the semantic utility in components: `<Badge className="bg-success text-success-foreground" />`.
4. Never bypass this with `bg-[#22c55e]`, `style={{ color: "#22c55e" }}`, or a raw hex in a CSS file.

## Parity rule

Every token must be defined in all four theme files. A token present in `light.css` and missing from
`dark-blue.css` renders as an unset variable, not as a fallback.

## Radii and spacing

- Use the design system's `--radius` scale: `rounded-sm`, `rounded-md`, `rounded-lg`.
- Spacing uses Tailwind's default scale (`p-2`, `gap-4`, etc.). Do not use arbitrary pixel values (`w-[347px]`).

## `cn()` and conditional classes

- Use `cn()` from `@/app/lib/utils` (clsx + tailwind-merge) for conditional class merging. (`@app/lib/utils` is the same file; match the file you are editing.)
- Wrap shadcn customizations in `cn()`.

## What NOT to do

- ❌ Arbitrary color values: `bg-[#ff0000]`, `text-[#333]`, `style={{ color: "#ef4444" }}`.
- ❌ Hard-coded hex in CSS files (outside `src/app/styles/`).
- ❌ `dark:` variants against literal colors (`dark:bg-[#000]`).
- ❌ Inline styles (`style={{}}`) for anything the design system covers.
- ❌ Arbitrary pixel values (`w-[347px]`) — use the spacing scale.
- ❌ Adding a `tailwind.config.js` — Tailwind v4 is CSS-first in this repo (`@tailwindcss/vite` in `vite.config.ts`).
- ❌ `!important` utilities (`!bg-white`, `!w-full`) anywhere under `src/modules/**` — `eslint.config.js` fails the build on them. If a primitive will not take the style it needs, add a variant to the primitive.
