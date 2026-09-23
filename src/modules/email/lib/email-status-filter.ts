import type {
  EmailStatusFilter,
  EmailThreadStatusFilter,
} from '@/modules/email/constants/email-filters';

/**
 * The thread status filter as the messages list request carries it.
 *
 * The filter used to run in the browser over whatever pages were loaded, and
 * the list auto-paged until a match appeared — 54 sequential requests through
 * a 2,700-message shared inbox to show "Inbox is empty". The server answers it
 * from the cache in one query now, so `all` is simply not sent.
 */
export const toThreadStatusFilter = (
  filter: EmailStatusFilter
): EmailThreadStatusFilter | undefined => (filter === 'all' ? undefined : filter);

/**
 * Whether a list narrowed by `status` should receive mail that just arrived.
 * New mail has no classification yet, so it is "open": it belongs in the
 * plain list and the "open" list, and in neither court nor the closed list.
 */
export const statusFilterAdmitsNewMail = (status: unknown): boolean =>
  status === null || status === undefined || status === 'open';
