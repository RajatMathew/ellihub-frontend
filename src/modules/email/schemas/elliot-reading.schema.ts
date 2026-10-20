import { z } from 'zod';

/**
 * Elliot's reading of a thread: what kind of email its newest read message is, whose court it
 * is in, the ElliHub records it is about and a drafted task. Read-only on the server — nothing
 * here has been applied to the thread until someone accepts it in the panel.
 *
 * The contract is `GET /elliot/readings` in `../elli-core/src/modules/elliot/routes.ts` (and
 * `src/docs/elliot.json`). Every field the panel can live without is optional, so an API that
 * ships ahead of or behind this client does not throw.
 */
export const elliotReadingLinkSchema = z.object({
  /** The reference type the link is saved as on the thread. */
  referenceType: z.enum(['project', 'rfq', 'purchaseOrder', 'changeOrder', 'invoice']),
  entityType: z.enum(['project', 'rfq', 'purchaseOrder', 'subChangeOrder', 'invoice']),
  entityId: z.string(),
  /** The record's name as the reference picker shows it. */
  label: z.string(),
  confidence: z.number(),
  /** At or above 0.85: Elliot is sure. Below it the link is offered as a "maybe". */
  confident: z.boolean().optional().default(false),
});

export const elliotTaskDraftSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  priority: z.enum(['P1', 'P2', 'P3']),
  /** `YYYY-MM-DD`: only a deadline the email states. */
  due_date: z.string().nullable().optional(),
  /** `HH:MM:SS`, business-timezone wall time; only when the email gives one. */
  due_time: z.string().nullable().optional(),
});

export const elliotThreadStateSchema = z.enum([
  'open',
  'open_our_court',
  'open_their_court',
  'closed',
]);

export const emailAiSuggestionSchema = z.object({
  id: z.string(),
  messageId: z.string().optional(),
  kind: z
    .enum(['project_work', 'purchasing', 'bidding', 'mail_notice', 'noise', 'other'])
    .nullable()
    .optional(),
  court: elliotThreadStateSchema.nullable().optional(),
  links: z.array(elliotReadingLinkSchema).optional().default([]),
  task: elliotTaskDraftSchema.nullable().optional(),
  /** When Elliot filed the thread (court, links) from its reading; absent if it has not. */
  appliedAt: z.string().nullable().optional(),
});

export type EmailAiSuggestion = z.infer<typeof emailAiSuggestionSchema>;
export type ElliotReadingLink = z.infer<typeof elliotReadingLinkSchema>;
export type ElliotTaskDraft = z.infer<typeof elliotTaskDraftSchema>;
