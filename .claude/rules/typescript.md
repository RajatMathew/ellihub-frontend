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
- `verbatimModuleSyntax` is on. Write type-only imports inline — `import { type VendorDetail, vendorsApi } from '...'` — which is also what ESLint's `consistent-type-imports` rule autofixes to.
- `noUnusedLocals` and `noUnusedParameters` are on, so an unused variable fails `tsc -b`, not just lint. Prefix a deliberately unused parameter with `_`.
- Always run `npm run lint` and `npm run build` (which includes `tsc -b`) before considering work complete — and then `npm run test`, which is `bun test tests/*.test.ts`. A type-check is not a test run, and this line used to claim the unit suite had no runner, which sent agents past 74 files of it. `npm run test:e2e` runs Playwright against `tests/e2e/` separately.
