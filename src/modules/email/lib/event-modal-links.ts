import type { CalendarEventLinks } from '@/modules/email/api';
import { recordKey, type LinkedEmail, type LinkedRecord } from '@/modules/email/lib/record-links';

/**
 * An event's links as the modal holds them, and whether the modal changed
 * them (elli-ui#1379) — an edit that only touches the links must not write the
 * event to the provider, and one that leaves them alone must not rewrite them.
 */

export type EventModalLinks = { emails: LinkedEmail[]; records: LinkedRecord[] };

export function eventLinksOf(links: CalendarEventLinks | undefined): EventModalLinks {
  return {
    emails: (links?.emails ?? []).map((link) => ({
      accountId: link.accountId,
      providerId: link.providerId,
      conversationKey: link.conversationKey,
      threadId: link.threadId,
      subject: link.subject,
      fromEmail: link.fromEmail,
    })),
    records: (links?.records ?? []).map((record) => ({ ...record })),
  };
}

const emailKey = (email: Pick<LinkedEmail, 'accountId' | 'providerId'>) =>
  `${email.accountId}:${email.providerId}`;

const sameSet = (left: string[], right: string[]) =>
  left.length === right.length && [...left].sort().join('|') === [...right].sort().join('|');

/** Whether the emails or records differ as sets — order does not count. */
export function eventLinksChanged(saved: EventModalLinks, current: EventModalLinks): boolean {
  return (
    !sameSet(saved.emails.map(emailKey), current.emails.map(emailKey)) ||
    !sameSet(saved.records.map(recordKey), current.records.map(recordKey))
  );
}

/** The API's input shapes for an event's links. */
export function toEventLinkInputs(links: EventModalLinks) {
  return {
    emailLinks: links.emails.map((email) => ({
      accountId: email.accountId,
      providerId: email.providerId,
      conversationKey: email.conversationKey ?? null,
      threadId: email.threadId ?? null,
      subject: email.subject ?? null,
      fromEmail: email.fromEmail ?? null,
    })),
    recordLinks: links.records.map((record) => ({
      entityType: record.entityType,
      entityId: record.entityId,
    })),
  };
}
