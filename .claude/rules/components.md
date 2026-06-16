---
paths:
  - "**/*.tsx"
---

# Component Rules

- Use **shadcn/ui** components as the foundation. Do not build custom components for things shadcn already provides.
- When adding a new shadcn component: `npx shadcn@latest add {component-name}`.
- shadcn/ui components in `src/components/ui/` are auto-generated — **do not manually edit them**. Customize via wrapper components or `cn()` overrides (from `@/lib/utils`).
- Shared/global components live in `src/components/`. Module-scoped components live in `src/modules/{module}/components/`. See `rules/module-structure.md` for the sub-folder rule.
- One responsibility per component. If a component drifts into managing multiple concerns, split it.
- For the 200-line cap, required UI states (loading/error/empty/success), accessibility requirements, and design-system constraints, see `rules/ui-quality.md` — those rules apply to every component.
