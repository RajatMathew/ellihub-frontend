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
 * A drawn edge and a real lift, not a hairline. The 1px ring this started with
 * read as "slightly paler paper"; the open conversation is the reader's place
 * in a long list and has to be findable without hunting (elli-ui#992). The ring
 * is a shade darker than `--mail-row-edge` so it holds against the white card,
 * and the shadow is deep enough to sit the row above the page rather than
 * merely beside it.
 */
export const EMAIL_ROW_SELECTED_SURFACE =
  'bg-mail-card shadow-[0_0_0_1.5px_var(--mail-row-selected-edge),0_2px_4px_rgba(26,28,31,0.08),0_10px_24px_-6px_rgba(26,28,31,0.20)]';

export const EMAIL_ROW_RESTING_SURFACE = 'bg-mail-paper hover:bg-mail-row-hover';

export const EMAIL_ROW_CHECKED_SURFACE = 'bg-mail-accent-soft';

export function emailRowSurfaceClasses({ isSelected, isChecked }: EmailRowSurfaceState): string[] {
  const classes = [isSelected ? EMAIL_ROW_SELECTED_SURFACE : EMAIL_ROW_RESTING_SURFACE];
  if (isChecked) classes.push(EMAIL_ROW_CHECKED_SURFACE);
  return classes;
}
