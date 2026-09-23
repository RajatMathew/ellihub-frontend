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
