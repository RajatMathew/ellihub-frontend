/**
 * The two independent axes the conversation list can be narrowed by.
 *
 * They live here rather than beside a component because three unrelated pieces
 * read them — the list chrome that sets them, the URL state that persists them,
 * and the page that applies them — and the component they used to hang off
 * (`EmailMailToolbar`) was replaced by the list-column chrome in elli-ui#921.
 */
export type EmailListFilter = 'all' | 'unread' | 'flagged' | 'attachments' | 'other';

/**
 * Thread state filter — independent of the "show messages" filter above.
 * Unclassified threads default to "open" (matching how the row status pill
 * renders), so the "open" filter includes them. "open_our_court" and
 * "open_their_court" narrow further to one side of an open thread, matching
 * the same two states `EmailThreadState` carries elsewhere.
 */
export type EmailStatusFilter = 'all' | 'open' | 'open_our_court' | 'open_their_court' | 'closed';

/** The status filter as the API takes it: `all` is simply not sent. */
export type EmailThreadStatusFilter = Exclude<EmailStatusFilter, 'all'>;

/**
 * The value a filter group takes when one of its items is picked. Picking the
 * item that is already on clears the group back to `all`, so a filter can be
 * turned off where it was turned on. Radix fires `onValueChange` again for an
 * already-checked radio item, which is what makes the second click reach here.
 */
export const toggleFilterValue = <T extends string>(current: T, picked: T, all: T): T =>
  picked === current ? all : picked;
