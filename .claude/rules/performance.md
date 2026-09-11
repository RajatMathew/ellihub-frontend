---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Performance — earn every request

The app talks to `elli-core` over a network the user is waiting on. **Every request must justify
itself.** The default failure here is not one slow query; it is a screen that quietly fires twenty
requests where three would do, and nobody notices because each one is fast.

Before you add a fetch, answer: does this data already exist in the cache? Can it come back with a
request already in flight? Does the user need it *now*, or only when they open something?

## The rules that matter most

1. **No request loops.** Never fire one request per item in a list, and never poll in a `for` loop
   with a `sleep`. If you need N things, ask the server for N things — add or extend an endpoint in
   `elli-core` rather than hammering a single-item route. (This repo has shipped a refresh path that
   issued up to 1000 sequential POSTs at 750ms intervals with no abort. Do not write another.)
2. **No waterfalls.** A query whose `enabled` waits on another query's result serialises two round
   trips. If the second request does not truly need the first one's *data*, let them run in
   parallel. A common fix: let the server default a parameter instead of fetching it first only to
   send it straight back.
3. **Reuse the cache before fetching.** TanStack Query dedupes by key, so the same key from two
   components is one request — but only if the keys match exactly. Keys live in the module's
   `constants/` as a factory; build them there and never hand-assemble a key inline, or you will
   silently create a second cache entry and a second request.
4. **Invalidate narrowly.** `invalidateQueries({ queryKey: keys.all })` after editing one row
   refetches every list and detail in the module. Invalidate the specific key, or update the cache
   in place with `setQueryData` when the mutation response already contains the new row.
5. **Set `staleTime` to the data's real volatility.** The client default is 60s with
   `refetchOnWindowFocus: false` (`src/app/providers/query.tsx`). Reference data — folders, tags,
   lookups, permissions — should be minutes, not seconds; `src/modules/email/hooks/email.hooks.ts`
   is the worked example (metadata 5min, messages 1min, 15min `gcTime`).
6. **Paginate and bound.** Lists go through the shared list kit with server-side pagination. Never
   fetch "all" and filter on the client. For paging, prefer `placeholderData` over a skeleton so the
   table does not flash empty between pages.
7. **Bound every request in time.** The axios client sets a default timeout; an upload that needs
   longer gets a *larger finite* timeout, never `timeout: 0`. An unbounded request that stalls is
   indistinguishable from a hang, and it strands whatever UI state was waiting on it.
8. **Make cancellable work cancellable.** Long uploads and searches take an `AbortSignal`, and
   superseded work is aborted rather than left racing the current request.

## On the client

- Lazy-load route components (`React.lazy`) — the router already does this; keep new routes in line.
- Do not import a heavy library at module scope for a rarely-opened panel. Import it in the branch
  that needs it.
- Memoise derived data that is expensive *and* recomputed on every render — not everything. A
  `useMemo` around a cheap map is noise that makes the render path harder to read.
- Watch for effects that `setState` unconditionally: they re-render in a loop and ESLint
  (`react-hooks/set-state-in-effect`) already flags them.
- Render long lists with the existing virtualisation/pagination patterns rather than mapping
  thousands of rows.

## Optimistic updates

Preferred for mutations the user expects to feel instant (moving a task, marking read). If you write
one: apply the change to the exact cache key, keep the *whole* previous entry to roll back to, and
roll back on error. **Carry every field forward** — an optimistic update that drops a field the
server would have returned makes the UI flicker (this repo has done it with `assignedTo`).

## Before you call it done

Open DevTools → Network, exercise the screen, and look at the request list. Ask whether each one had
to happen and whether any repeats. If a change adds a request to a path that already had one, say so
in the PR and say why it is necessary. "It works" is not the bar; the bar is that it works without
making the app slower than it was.
