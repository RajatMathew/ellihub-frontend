---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Forms & Validation

- Use **React Hook Form** with **Zod v4** resolvers for all forms.
- Define Zod schemas in the module's `schemas/{resource}.schema.ts`.
- Extract TypeScript types from Zod schemas — do not define form types separately.
- **The canonical create/edit form page is `src/modules/directory/pages/vendor-form.tsx`**, built on
  `FormPageShell` + `FormPageHeader` + `FormLayout` / `FormContent` + `FormSectionNav` from
  `@/app/components`. Copy that chrome rather than inventing one; see `page-headers.md`.
- Keep the **read** schema (what the API returns) and the **input** schema (what the form collects)
  separate in the same file, as `vendor.schema.ts` does (`vendorDetailSchema` vs
  `createVendorInputSchema`). Read schemas must match the wire format — money arrives as a string,
  see `data-fetching.md`.

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

## Mock fill (dev only)

`MockDataButton` (`@/app/components/dev/mock-data-button`) fills a form with plausible values when
`VITE_ENABLE_MOCK_DATA_FILL` is on (`src/app/lib/mock-data-fill.ts`). It owns its own visibility, so
pass it through the header's `leadingActions` / `trailingActions`, not as an `ActionDef` —
`vendor-form.tsx` passes it as `leadingActions` and hides it when editing.

## Form submission

Pass the submit handler via `void form.handleSubmit(handler)(e)` to avoid unhandled promise warnings:

```tsx
<form onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}>
```
