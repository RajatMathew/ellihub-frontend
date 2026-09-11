---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Import Conventions

Four aliases are configured, in both `tsconfig.app.json` and `vite.config.ts`:

| Alias        | Resolves to     |
| ------------ | --------------- |
| `@/*`        | `src/*`         |
| `@app/*`     | `src/app/*`     |
| `@core/*`    | `src/core/*`    |
| `@modules/*` | `src/modules/*` |

- Use an alias for any cross-directory import.
- Use relative paths (`./sibling`) only for files in the **same directory**. Anything that climbs with `../` should use an alias instead.
- `@/app/foo` and `@app/foo` are the same file and both appear in the codebase. Match whichever the file you are editing already uses; do not churn a file to convert between them.

```ts
// Good — cross-directory via alias
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";
import { vendorsKeys } from "@/modules/directory/constants/vendors.keys";

// Good — sibling in the same directory
import { formatLabel } from "./utils";

// Bad — climbing directories
import { Button } from "../../components/ui/button";
```

## Ordering

Import order is enforced by Prettier (`@ianvs/prettier-plugin-sort-imports`, configured in
`prettier.config.js`): react → builtins → third party → `@app/` → `@core/` → `@modules/` →
relative. **Do not hand-sort imports** — run `npm run format` and let the plugin do it.

`verbatimModuleSyntax` is on and ESLint enforces `consistent-type-imports` with inline type
specifiers, so type-only imports are written `import { type Foo, bar } from '...'`.
