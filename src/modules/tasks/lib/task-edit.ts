import { toTaskFormValues, toTaskPayload } from '../components/task-form/task-form-values';
import type { CreateTaskInput, Task } from '../schemas/task.schema';

/**
 * The fields an edit actually changed, and nothing else.
 *
 * The update endpoint is a partial update: an absent field means "leave it
 * alone". Sending the whole form defeated that in a way that was invisible
 * until it bit. The dialog holds the due date as a day and a time from two
 * native inputs and rebuilds one instant on save — so a date nobody touched
 * came back as a *different* instant, the server saw a genuine change, and
 * the card lost its hand-placed position on a title-only edit.
 *
 * Comparing against what the form produces from the original task — not the
 * original task itself — cancels the rebuild: both sides pass through the same
 * conversion, so an untouched field lands identical and is dropped.
 *
 * Relative imports on purpose: this is exercised by a bun test, and bun does
 * not resolve the `@/` alias.
 */
export function changedTaskFields(
  original: Task,
  saved: CreateTaskInput
): Partial<CreateTaskInput> {
  const baseline: CreateTaskInput = {
    ...toTaskPayload(toTaskFormValues(original)),
    emailReferences: original.emailReferences,
    entityLinks: original.entityLinks,
  };

  const changed: Partial<CreateTaskInput> = {};

  for (const key of Object.keys(saved) as (keyof CreateTaskInput)[]) {
    if (!sameValue(saved[key], baseline[key])) {
      // The two sides carry the same key set, so this is a per-key copy of a
      // value already typed as the field; the assertion only tells TypeScript
      // that the key on the left is the key on the right.
      (changed as Record<string, unknown>)[key] = saved[key];
    }
  }

  return changed;
}

/** Equal by content. The reference arrays are rebuilt on every submit. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  return JSON.stringify(a) === JSON.stringify(b);
}
