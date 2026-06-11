import { z } from 'zod';

export const templateSettingKindSchema = z.enum([
  'PDF_TERMS',
  'PDF_NOTICE',
  'MAIL_FEATURE',
  'MAIL_SENDER_GROUP',
  'MAIL_SIGNATURE',
  'PDF_PROFILE',
]);

export const templateSettingStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export type TemplateSettingKind = z.infer<typeof templateSettingKindSchema>;
export type TemplateSettingStatus = z.infer<typeof templateSettingStatusSchema>;

export type PdfTermsTemplateValue = { html: string };
export type PdfNoticeTemplateValue = { title: string; bodyHtml: string };
export type MailFeatureTemplateValue = {
  senderGroup?: string;
  subject: string;
  body: string;
  pdfProfileKey?: string;
};
export type MailSenderGroupTemplateValue = {
  allowed: string[];
  default?: string;
};
export type MailSignatureTemplateValue = {
  name: string;
  role: string;
  email: string;
  address: string;
  phone: string;
  fax: string;
  certificationLine: string;
  images: Array<{
    fileName: string;
    contentId: string;
    width: number;
    height: number;
    alt: string;
    line: number;
  }>;
};
export type PdfProfileTemplateValue = {
  company: {
    name: string;
    addressLines: string[];
    phone: string;
    logoPath: string;
  };
  shipToName?: string;
};

export type TemplateSettingValue =
  | PdfTermsTemplateValue
  | PdfNoticeTemplateValue
  | MailFeatureTemplateValue
  | MailSenderGroupTemplateValue
  | MailSignatureTemplateValue
  | PdfProfileTemplateValue;

export const templateSettingSchema = z.object({
  id: z.string(),
  kind: templateSettingKindSchema,
  key: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  value: z.unknown(),
  tags: z.array(z.string()).default([]),
  isDefault: z.boolean(),
  status: templateSettingStatusSchema,
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
  deletedBy: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TemplateSetting = Omit<z.infer<typeof templateSettingSchema>, 'value'> & {
  value: TemplateSettingValue;
};

export type TemplateSettingInput = {
  kind: TemplateSettingKind;
  key: string;
  name: string;
  description?: string | null;
  value: TemplateSettingValue;
  tags: string[];
  isDefault: boolean;
  status: TemplateSettingStatus;
};

export type TemplateSettingUpdateInput = Partial<TemplateSettingInput> & { id: string };
