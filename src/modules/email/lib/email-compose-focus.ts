/**
 * Where the full-page editor puts the caret when it opens, and — just as
 * important — when it must leave the caret alone.
 *
 * The composer used to decide this inside a `requestAnimationFrame` that read a
 * ref which kept mutating as the form changed. When that frame ran late (a
 * backgrounded tab throttles rAF entirely, and a lazy chunk delays the first
 * paint), the "open" focus landed with whatever the form looked like *then* —
 * which is why the caret jumped to the message body the moment the first To
 * chip was committed (elli-ui#1011). The decision belongs here, taken once,
 * from values read at the moment the editor opened.
 */

export type ComposeFocusField = 'to' | 'body';

/**
 * True when the editor opens with its recipient already settled, so the caret
 * belongs where the user still has something to write.
 */
export function prefersBodyFocus(input: { isEditingDraft?: boolean; to: string }): boolean {
  return Boolean(input.isEditingDraft) || input.to.trim().length > 0;
}

/**
 * The field to focus, or `null` for "focus nothing". Focus is never taken from
 * inside the editor: if the caret is already in one of its fields the user put
 * it there, and moving it is the bug, not the feature.
 */
export function resolveComposeAutoFocusField(input: {
  preferBody: boolean;
  hasFocusInside: boolean;
}): ComposeFocusField | null {
  if (input.hasFocusInside) return null;
  return input.preferBody ? 'body' : 'to';
}
