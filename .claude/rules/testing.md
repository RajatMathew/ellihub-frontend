---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# Testing

**Every change ships with a test that would have failed before it.** Not a test that exercises the
happy path you already believe works — a test that reproduces the bug, or pins the behaviour you
just added. If you cannot write one, say so and say why; do not quietly skip it.

This is the rule that most often gets dropped under time pressure, and it is the reason the same
bugs come back. A fix without a regression test is an invitation to re-fix it in three weeks.

## How tests actually run here

The unit tests use **`bun:test`** (`import { describe, expect, test } from 'bun:test'`) and live in
`tests/` as `*.test.ts`:

```bash
bun test tests/*.test.ts          # the unit suite
bun test tests/email-addresses.test.ts   # one file
npm run test:e2e                  # Playwright, tests/e2e/*.spec.ts
```

Two things to know before you trust a green run:

- **`npm run lint && npm run build` does not run any test.** Never report "tests pass" on the
  strength of a type-check. Run the suite.
- The glob matters. `bun test tests/` would also pick up `tests/e2e/*.spec.ts`, which are Playwright
  specs and cannot run under `bun:test`. Use `tests/*.test.ts`.

## What to test

The suite is deliberately **pure-logic**: there is no jsdom, no React Testing Library, no component
renderer. So the testable unit is a **function**, not a component. Write the logic that way and it
stays testable:

- Pull the decision out of the component into `src/modules/{feature}/lib/` and test it there.
  `tests/task-board-rules.test.ts`, `tests/email-addresses.test.ts` and
  `tests/mailbox-url-state.test.ts` are the pattern to copy.
- Good candidates, all of which have bitten this repo: cache and optimistic-update transforms
  (`tests/task-optimistic-delete.test.ts`, `tests/monthly-bills-cache.test.ts`), URL/query-state
  round-trips, error-shape narrowing (`tests/api-error-code.test.ts`), address and input parsing,
  date and month grouping, anything with a fallback branch.
- If the behaviour only exists inside a component or a hook, that is usually a signal to extract it
  — not a reason to skip the test.

For a flow that genuinely needs a browser (a real drag, a real navigation, a real form submit),
write a Playwright spec in `tests/e2e/` instead.

## Writing the test

- Name what breaks, not what the function is called: `'keeps the assignee when a thread is
  reclassified'` beats `'classifyThread works'`.
- Cover the edge that caused the bug — empty list, absent field, duplicate, boundary size, cancelled
  request, the second call. The happy path is rarely where the defect was.
- No network, no timers you do not control, no reliance on real dates. Pass the clock in.
- A test that would still pass with your fix reverted is not a regression test. Check by reverting.

## Honesty about verification

State exactly what you ran and what it said. If you could not exercise something — a drag-and-drop
gesture, a provider round-trip, a staging-only failure — write that down rather than implying
coverage you do not have. A confident "verified" on an unverified path is worse than no claim.

Known state: the unit suite is green. It was not for a long time — `email-account-identity` failed
because the test still asserted the identity format from before shared mailboxes got a scope
prefix, and the failure was carried in the docs as expected rather than fixed. If you find a test
failing on `dev`, read it before you route around it: a stale assertion and a real regression look
identical from the run output.
