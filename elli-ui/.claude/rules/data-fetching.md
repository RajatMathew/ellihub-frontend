---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Data Fetching & State Management

- Use **TanStack React Query v5** for all server state (API data). Do not store API responses in Zustand or React state.
- Define query keys as constants in the module's `constants/` directory using `as const` for type safety.
- Wrap queries and mutations in custom hooks inside the module's `hooks/` directory.
- Use **Zustand v5** only for client-side UI state that doesn't come from the server (e.g. sidebar open/closed, selected tab).
- Handle API errors in React Query's `onError` callbacks.
- Do not silently swallow errors — always surface them to the user or log them.
- Use **Sonner** (`toast`) for user-facing error/success notifications.

## TanStack Query v5 Changes

- `useQuery` no longer accepts positional arguments. Always pass an object: `useQuery({ queryKey, queryFn })`.
- `useMutation` callbacks (`onSuccess`, `onError`) go inside the options object.
- Prefer `void queryClient.invalidateQueries(...)` to explicitly discard the promise.
- Use `enabled` option to conditionally disable queries (e.g. `enabled: !!id`).
