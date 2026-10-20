import { useState } from 'react';

/**
 * A primitive, compared with Object.is. Never an object or array: a new one on
 * every render would never compare equal, and the reset would run forever.
 */
export type ResetScope = string | number | boolean | null | undefined;

const NOT_SEEN = Symbol('not seen');

/**
 * Runs `reset` during render, once, each time `scope` changes.
 *
 * This is React's documented answer to "adjust some state when a prop
 * changes", and it replaces the effect these call sites used to run:
 *
 * ```ts
 * useEffect(() => {
 *   setSelected(new Set());
 * }, [folderId]);
 * ```
 *
 * An effect there is wrong twice over. It renders with the *stale* state
 * first, then sets state, then renders again — so the user sees one frame of
 * the previous folder's selection, and every consumer re-renders twice. It is
 * also what `react-hooks/set-state-in-effect` flags, and the rule is right:
 * this is state derived from props, and deriving it in an effect is the slow
 * way to be correct.
 *
 * Setting state during render is legal for a component's *own* state — React
 * discards the in-progress render and immediately re-runs it with the new
 * value, before anything is committed or painted. `react-hooks/set-state-in-render`
 * allows exactly this shape and rejects the unconditional one.
 *
 * `scope` must be derived only from props, context or other external input —
 * never from the state `reset` writes, or the two chase each other and React
 * throws on the update depth.
 *
 * Fires on the first render too, matching the mount run of the effect it
 * replaces. Call sites that must not reset on mount guard inside `reset`, the
 * same way the effect's early `if (!open) return;` did.
 *
 * @example
 * useResetOnChange(`${accountId}|${folderId}`, () => setSelected(new Set()));
 */
export function useResetOnChange(scope: ResetScope, reset: () => void): void {
  // NOT_SEEN never equals a scope, so the first render always runs `reset` —
  // which is what the effect did on mount.
  const [seenScope, setSeenScope] = useState<ResetScope | typeof NOT_SEEN>(NOT_SEEN);

  if (!Object.is(scope, seenScope)) {
    setSeenScope(scope);
    reset();
  }
}
