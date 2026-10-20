import {
  isRecordType,
  type LinkedEmail,
  type LinkedRecord,
} from '@/modules/email/lib/record-links';
import type { TaskEmailReference, TaskEntityLink } from '@/modules/tasks/schemas/task.schema';
import { z } from 'zod';

/**
 * A task's emails and records as the modal's link fields hold them, and back
 * (elli-ui#1379). Pure, so the round trip is tested without a renderer.
 */

/** The search's answer: the reference picker's options. */
export const linkOptionsSchema = z.array(
  z.object({
    entityType: z.string().nullish(),
    entityId: z.string().nullish(),
    label: z.string(),
    meta: z.string().nullish(),
  })
);

/** Options as records, dropping anything that is not a linkable record ("Other"). */
export function toLinkedRecords(options: z.infer<typeof linkOptionsSchema>): LinkedRecord[] {
  return options.flatMap((option) =>
    isRecordType(option.entityType) && option.entityId
      ? [
          {
            entityType: option.entityType,
            entityId: option.entityId,
            label: option.label,
            meta: option.meta ?? null,
          },
        ]
      : []
  );
}

export function taskRecordsOf(links: readonly TaskEntityLink[]): LinkedRecord[] {
  return links.map((link) => ({
    entityType: link.entityType,
    entityId: link.entityId,
    label: link.label ?? null,
    meta: link.meta ?? null,
  }));
}

export function toTaskEntityLinks(records: readonly LinkedRecord[]): TaskEntityLink[] {
  return records.map((record) => ({ entityType: record.entityType, entityId: record.entityId }));
}

export function taskEmailsOf(references: readonly TaskEmailReference[]): LinkedEmail[] {
  return references.map((reference) => ({
    accountId: reference.accountId,
    providerId: reference.providerId,
    conversationKey: reference.conversationKey ?? null,
    threadId: reference.threadId ?? null,
    subject: reference.subject ?? null,
    fromEmail: reference.fromEmail ?? null,
  }));
}

export function toTaskEmailReferences(emails: readonly LinkedEmail[]): TaskEmailReference[] {
  return emails.map((email) => ({
    accountId: email.accountId,
    providerId: email.providerId,
    conversationKey: email.conversationKey ?? null,
    threadId: email.threadId ?? null,
    subject: email.subject ?? null,
    fromEmail: email.fromEmail ?? null,
  }));
}
