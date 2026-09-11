---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Error Handling

## Principles

- **Never silently swallow errors.** Every `catch` must either surface the error to the user or log it meaningfully.
- **Type errors as `unknown`.** In `catch` blocks, the error is `unknown` — narrow before accessing properties.
- **User-facing errors → Sonner toast.** Use `toast.error()` from Sonner for mutation failures and `toast.success()` for confirmations.
- **Query errors → `QueryErrorState`.** Use `QueryErrorState` from `@/app/components/query-error-state` for query-level failures with a retry button.
- **API errors → `toastApiError`.** `src/app/lib/toast-api-error.ts` turns an Axios error into the right message; prefer it (or `getApiErrorMessage`) over hand-writing `toast.error` for a server failure.

## Patterns

### Mutation error handling

```ts
useMutation({
  mutationFn: createProject,
  onSuccess: () => {
    toast.success("Project created");
    void queryClient.invalidateQueries({ queryKey: PROJECT_QUERY_KEYS.all });
  },
  onError: () => {
    toast.error("Failed to create project");
  },
});
```

### Query error handling in components

```tsx
const { data, isLoading, isError, refetch } = useProjects();

if (isLoading) return <LoadingState />;
if (isError) return <ErrorState onRetry={() => void refetch()} />;
```

### Axios interceptors

The global interceptors live in `src/app/api/client.ts` and own exactly two things: the forced
PWA-update flow (HTTP 426 / `APP_UPDATE_REQUIRED`) and the redirect to `/sign-in` on an
unauthenticated response (`src/app/api/api-error-code.ts`). Everything else is deliberately left to
the call site. **Do not add global error handling there** — keep it at the mutation/query level for
user-specific messaging.

`console.log` is an ESLint warning and is stripped from production builds by terser
(`pure_funcs` in `vite.config.ts`). `console.warn` / `console.error` survive; use those if you need
a breadcrumb. Sentry is initialised in `src/main.tsx` when `VITE_SENTRY_DSN` is set.

## What NOT to do

- ❌ `catch (e: any)` — use `catch (e: unknown)` and narrow.
- ❌ `console.log(error)` without user notification — always pair with a toast or UI indicator.
- ❌ Alert dialogs for recoverable errors — use toasts; reserve dialogs for destructive/irreversible actions.
- ❌ Retry loops in API functions — let React Query handle retries via its `retry` option.
