---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Import Conventions

- Use the `@/` path alias (maps to `src/` via `tsconfig.json` and `vite.config.ts`) for any cross-directory import.
- Use relative paths (`./sibling`) only for files in the **same directory**. Anything that climbs with `../` should use `@/` instead.

```ts
// Good — cross-directory via alias
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

// Good — sibling in the same directory
import { formatLabel } from "./utils";

// Bad — climbing directories
import { Button } from "../../components/ui/button";
```
