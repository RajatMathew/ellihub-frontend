---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Forms & Validation

- Use **React Hook Form** with **Zod v4** resolvers for all forms.
- Define Zod schemas in the module's `schemas/` directory.
- Extract TypeScript types from Zod schemas — do not define form types separately.

## Zod v4 API

The project uses **Zod v4**. Prefer the top-level format validators (`z.email()`, `z.uuid()`, `z.url()`, `z.ipv4()`) over the deprecated chained forms (`z.string().email()`, `z.string().uuid()`). They are clearer and more tree-shakable.

```ts
import { z } from "zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  id: z.uuid().optional(),
});
type LoginFormData = z.infer<typeof loginSchema>;
```

Use the resolver from `@hookform/resolvers/zod`:

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});
```

## Form submission

Pass the submit handler via `void form.handleSubmit(handler)(e)` to avoid unhandled promise warnings:

```tsx
<form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}>
```
