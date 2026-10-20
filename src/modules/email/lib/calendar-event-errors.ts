import { isAxiosError } from 'axios';

/**
 * Whether reading a linked event failed because the event is gone — the
 * provider answered 404 — and not for any other reason.
 *
 * Only this may lead to offering to remove the link. A timeout, a rate limit, an
 * expired mailbox or a permission error says nothing about the event, and the
 * link used to be dropped on far less: an empty calendar list.
 */
export function isEventGone(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
