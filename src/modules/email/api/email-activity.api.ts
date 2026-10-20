import api from '@/app/api';
import { z } from 'zod';

const BASE = '/email-activity';

/**
 * One thing done from an email (elli-ui#1309): by a person, or by Elliot with
 * the person who approved it. `summary` is the sentence after the actor's
 * name — "created RFQ RFQ-0042 on project PS 082K".
 */
const emailActivitySchema = z.object({
  id: z.string(),
  accountId: z.string(),
  accountLabel: z.string(),
  providerId: z.string().nullable(),
  conversationKey: z.string(),
  threadSubject: z.string().nullable(),
  kind: z.enum(['triage', 'action', 'note']),
  action: z.string(),
  summary: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  entityLabel: z.string().nullable(),
  details: z.unknown().nullable(),
  note: z.string().nullable(),
  actor: z.object({
    type: z.enum(['human', 'agent']),
    userId: z.string(),
    name: z.string(),
    image: z.string().nullable(),
  }),
  agentName: z.string().nullable(),
  approvedBy: z.object({ id: z.string(), name: z.string() }).nullable(),
  createdAt: z.string(),
  editedAt: z.string().nullable(),
  canEdit: z.boolean(),
  /**
   * For an "added task" row: the task as it is now, deleted or not. Optional
   * until the API that sends it is deployed; without it the row keeps its
   * sentence.
   */
  task: z
    .object({
      title: z.string(),
      status: z.enum(['OPEN', 'COMPLETED']),
      priority: z.enum(['P1', 'P2', 'P3']),
      dueAt: z.string().nullable(),
      assignee: z.string().nullable(),
      deleted: z.boolean(),
    })
    .nullish(),
});

const activityPageSchema = z.object({
  items: z.array(emailActivitySchema),
  nextBefore: z.string().nullable(),
});

export type EmailActivity = z.infer<typeof emailActivitySchema>;
export type EmailActivityPage = z.infer<typeof activityPageSchema>;

export type EmailActivityFilter = {
  accountId?: string;
  actorType?: 'human' | 'agent';
};

function unwrapData(data: unknown): unknown {
  const response = data as Record<string, unknown>;
  return response?.data ?? response;
}

export const emailActivityApi = {
  async listForThread(accountId: string, conversationKey: string): Promise<EmailActivity[]> {
    const res = await api.get(`${BASE}/thread`, { params: { accountId, conversationKey } });
    return z.array(emailActivitySchema).parse(unwrapData(res.data));
  },

  async listForOrganization(
    filter: EmailActivityFilter & { before?: string; limit?: number }
  ): Promise<EmailActivityPage> {
    const res = await api.get(BASE, { params: filter });
    return activityPageSchema.parse(unwrapData(res.data));
  },

  async addNote(input: {
    accountId: string;
    conversationKey: string;
    providerId?: string | null;
    note: string;
  }): Promise<EmailActivity> {
    const res = await api.post(`${BASE}/notes`, input);
    return emailActivitySchema.parse(unwrapData(res.data));
  },

  async editNote(id: string, note: string): Promise<EmailActivity> {
    const res = await api.patch(`${BASE}/notes/${id}`, { note });
    return emailActivitySchema.parse(unwrapData(res.data));
  },

  async deleteNote(id: string): Promise<void> {
    await api.delete(`${BASE}/notes/${id}`);
  },
};
