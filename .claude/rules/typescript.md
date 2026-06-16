---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Rules

- **Strict mode is ON** — respect it. Never bypass with `@ts-ignore` or `@ts-expect-error` unless absolutely unavoidable, and leave a comment explaining why.
- **Never use `any`.** It disables type checking and hides bugs.
- **`unknown` is the preferred type-safe alternative** for values whose shape is genuinely not known at compile time (e.g. `catch` blocks, `JSON.parse` results, third-party payloads). Narrow with a type guard or Zod `.parse()` before use.
- Prefer `interface` for object shapes, `type` for unions/intersections/utility types.
- Use named exports, not default exports.
- Derive types from Zod schemas with `z.infer<typeof schema>` — do not duplicate type definitions manually.
- Export response/payload types from API files so hooks and components can import them directly.
- Always run `npm run lint` and `npm run build` (which includes `tsc -b`) before considering work complete.
