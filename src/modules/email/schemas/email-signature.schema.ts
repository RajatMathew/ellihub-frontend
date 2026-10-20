import { z } from 'zod';

/** One signature the composer can add, already rendered for the sender by elli-core. */
export const emailSignatureOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  /** The company default — the one PO, RFQ and change order emails use. */
  isCompanyDefault: z.boolean(),
  html: z.string(),
});

/** The user's choice for one mailbox. `templateId: null` is the company default. */
export const emailSignaturePreferenceSchema = z.object({
  templateId: z.string().nullable(),
  insertOnNew: z.boolean(),
  insertOnReply: z.boolean(),
});

export const emailSignaturesSchema = z.object({
  signatures: z.array(emailSignatureOptionSchema),
  preference: emailSignaturePreferenceSchema,
  /** What the composer adds on its own: the user's pick, else the company default. */
  defaultSignatureId: z.string().nullable(),
});

export type EmailSignatureOption = z.infer<typeof emailSignatureOptionSchema>;
export type EmailSignaturePreference = z.infer<typeof emailSignaturePreferenceSchema>;
export type EmailSignatures = z.infer<typeof emailSignaturesSchema>;
