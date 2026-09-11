---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Data Fetching & State Management

- Use **TanStack React Query v5** for all server state (API data). Do not store API responses in Zustand or React state.
- Define query keys as constants in the module's `constants/{resource}.keys.ts` using `as const`, as a factory object. The shape the codebase uses (`src/modules/directory/constants/vendors.keys.ts`):

  ```ts
  export const vendorsKeys = {
    all: ['vendors'] as const,
    list: () => [...vendorsKeys.all, 'list'] as const,
    detail: (id: string) => [...vendorsKeys.all, id] as const,
  };
  ```

- Wrap queries and mutations in custom hooks inside the module's `hooks/{resource}.hooks.ts`.
- Use **Zustand v5** only for client-side UI state that doesn't come from the server (e.g. sidebar open/closed, selected tab).
- Handle API errors in React Query's `onError` callbacks.
- Do not silently swallow errors — always surface them to the user or log them.
- Use **Sonner** (`toast`) for user-facing error/success notifications.

## TanStack Query v5 Changes

- `useQuery` no longer accepts positional arguments. Always pass an object: `useQuery({ queryKey, queryFn })`.
- `useMutation` callbacks (`onSuccess`, `onError`) go inside the options object.
- Prefer `void queryClient.invalidateQueries(...)` to explicitly discard the promise.
- Use `enabled` option to conditionally disable queries (e.g. `enabled: !!id`).

## Where the request actually goes

- The axios instance is `src/app/api/client.ts`, re-exported from `@/app/api`. Its `baseURL` is
  `${VITE_API_BASE_URL}/api/v1` with `withCredentials: true` — never build a URL that repeats
  `/api/v1`, and never call `fetch` directly for app data.
- The server is the separate **`elli-core`** repo (Hono/Bun/Prisma), checked out at `../elli-core`.
  Its route files are the contract; read them rather than guessing a payload shape.
- List endpoints return `{ data, pagination }`; detail endpoints return `{ data }`. The API layer
  unwraps that and validates with the module's Zod schema before returning — see
  `src/modules/directory/api/vendors.api.ts` for the pattern.
- Resource list pages drive their query through `useListQuery` / `useListState` in
  `@/app/components/data-table`, which owns URL state, filters, sorting and pagination. Do not
  re-implement that with a raw `useQuery` plus `useSearchParams`.

## The wire format (this has broken a page before)

`elli-core` stores money as Prisma `Decimal`, and `JSON.stringify` serializes `Decimal` as a
**string**. `GeneralContractor.retainagePercent` once changed `Float` → `Decimal` in the API,
arrived as `"10"` instead of `10`, and the client's `z.number()` threw — the general contractors
page stopped loading.

- Parse money/percent columns with `z.string()` (nullable where the column is), and only use
  `z.coerce.number()` where you have decided coercion is right.
- Do arithmetic with `decimal.js`, via helpers like
  `src/modules/project/lib/commercial-decimal.ts` or
  `src/modules/monthly-bills/lib/monthly-bills-money.ts`. Never with floats.
- Spell enums exactly as the server does — a `z.enum([...])` missing a value throws on that row.
- The authoritative per-column JSON type, nullability and enum values are pinned in
  `../elli-core/src/api/wire-format.snapshot.json`. Check there before writing or changing a schema.

## Permissions

`useAccess()` (`src/app/contexts/access-context.ts`) exposes the current user's role and
permissions, loaded by `getCurrentAccess()` in `src/app/api/access.ts` (`GET /users/me/access`).
Every `{ resource, action }` pair you write — in a `RouteDef`'s `access`, in a header `ActionDef`'s
`enabled` — must exist in `../elli-core/src/lib/permissions.ts` (the `statement` object). Resources
do not all have the same actions: `leave` has only `create`, `approve` and `view`.
