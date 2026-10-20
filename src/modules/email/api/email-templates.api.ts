import api from '@/app/api';
import { z } from 'zod';

const BASE = '/email-templates';

/**
 * A reply someone writes often (elli-ui#668), kept per person. `body` is the
 * message only — the composer adds the signature.
 */
const emailTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string().nullable(),
  body: z.string(),
  updatedAt: z.string(),
});

export type EmailTemplate = z.infer<typeof emailTemplateSchema>;
export type EmailTemplateInput = { name: string; subject: string | null; body: string };

function unwrapData(data: unknown): unknown {
  const response = data as Record<string, unknown>;
  return response?.data ?? response;
}

export const emailTemplatesApi = {
  async list(): Promise<EmailTemplate[]> {
    const res = await api.get(BASE);
    return z.array(emailTemplateSchema).parse(unwrapData(res.data));
  },

  async create(input: EmailTemplateInput): Promise<EmailTemplate> {
    const res = await api.post(BASE, input);
    return emailTemplateSchema.parse(unwrapData(res.data));
  },

  async update(id: string, input: Partial<EmailTemplateInput>): Promise<EmailTemplate> {
    const res = await api.patch(`${BASE}/${encodeURIComponent(id)}`, input);
    return emailTemplateSchema.parse(unwrapData(res.data));
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`);
  },
};
