/**
 * The background/elevation a conversation row paints, given the two states it
 * can be in at once: it can be the thread currently open in the reading pane,
 * and it can be ticked for a bulk action.
 *
 * These are independent signals and the row has to show both. The first version
 * treated them as one — the checked tint was suppressed whenever the row was
 * also the open thread — so ticking the open conversation changed nothing you
 * could see, and the count in the action bar disagreed with the list
 * (elli-ui#999).
 *
 * Order matters: the checked tint is emitted last so `cn()`'s tailwind-merge
 * resolves it over the selected surface's own background while leaving the
 * selected ring and lift intact. A row that is both reads as "open **and**
 * ticked" rather than one or the other.
 */
export interface EmailRowSurfaceState {
  /** This row is the conversation open in the reading pane. */
  isSelected: boolean;
  /** This row's checkbox is ticked for a bulk action. */
  isChecked: boolean;
}

/**
 * A drawn edge and a real lift, not a hairline. A plain `border` (rather than
 * folding the edge into the box-shadow ring) so it reads as a border, not as
 * a glow — the open conversation is the reader's place in a long list and has
 * to be findable without hunting (elli-ui#992). `--mail-row-edge` rather than
 * the firmer `--mail-row-selected-edge` — the lift shadow is what carries the
 * "this one is open" signal, so the edge itself only needs to be a light,
 * legible line against the white card, not a second heavy marker.
 */
export const EMAIL_ROW_SELECTED_SURFACE =
  'bg-mail-card border border-mail-row-edge shadow-[0_1px_2px_rgba(26,28,31,0.04),0_4px_10px_-6px_rgba(26,28,31,0.10)]';

/**
 * Only the open conversation is a card. A resting row sits directly on the
 * mail paper with no shadow of its own — a list of bordered boxes reads as
 * forty things to deal with, not a list with your place kept in it
 * (elli-ui#921). It still carries a transparent 1px border, matching the
 * selected row's, so opening a conversation never adds or removes a border
 * from the box model — only its color changes, which costs no layout
 * (elli-ui#1103).
 *
 * `group-hover` rather than this element's own `hover`: the row's checkbox
 * sits in an absolutely-positioned sibling on top of part of it, and the
 * cursor moving onto that sibling isn't "hovering this element" anymore, so
 * a plain `hover:` dropped the tint the moment the pointer reached the
 * checkbox. `group-hover` reads off the row's outer `<article>` instead,
 * which the checkbox is still inside.
 */
export const EMAIL_ROW_RESTING_SURFACE =
  'bg-mail-paper border border-transparent group-hover:bg-mail-row-hover';

export const EMAIL_ROW_CHECKED_SURFACE = 'bg-mail-accent-soft';

export function emailRowSurfaceClasses({ isSelected, isChecked }: EmailRowSurfaceState): string[] {
  const classes = [isSelected ? EMAIL_ROW_SELECTED_SURFACE : EMAIL_ROW_RESTING_SURFACE];
  if (isChecked) classes.push(EMAIL_ROW_CHECKED_SURFACE);
  return classes;
}
