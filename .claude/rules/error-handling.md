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
- **Query errors → ErrorState component.** Use the shared `<ErrorState />` component for query-level failures with a retry button.

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

### Axios interceptor

The global Axios interceptor in `src/lib/axios.ts` logs errors to the console. Do not add additional global error handling — keep it at the mutation/query level for user-specific messaging.

## What NOT to do

- ❌ `catch (e: any)` — use `catch (e: unknown)` and narrow.
- ❌ `console.log(error)` without user notification — always pair with a toast or UI indicator.
- ❌ Alert dialogs for recoverable errors — use toasts; reserve dialogs for destructive/irreversible actions.
- ❌ Retry loops in API functions — let React Query handle retries via its `retry` option.
