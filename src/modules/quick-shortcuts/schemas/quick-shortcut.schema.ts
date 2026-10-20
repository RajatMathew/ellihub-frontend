import { z } from 'zod';

export const MAX_QUICK_SHORTCUTS = 20;

export const quickShortcutSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    destinationType: z.enum(['INTERNAL', 'EXTERNAL']),
    internalPath: z.string().nullable(),
    externalUrl: z.string().nullable(),
    openInNewTab: z.boolean(),
    position: z.number().int().nonnegative(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((shortcut, ctx) => {
    const validInternal =
      shortcut.destinationType === 'INTERNAL' &&
      Boolean(shortcut.internalPath) &&
      shortcut.externalUrl === null;
    const validExternal =
      shortcut.destinationType === 'EXTERNAL' &&
      Boolean(shortcut.externalUrl) &&
      shortcut.internalPath === null;
    if (!validInternal && !validExternal) {
      ctx.addIssue({
        code: 'custom',
        message: 'Shortcut destination is invalid',
      });
    }
  });

export type QuickShortcut = z.infer<typeof quickShortcutSchema>;

export type QuickShortcutWriteInput =
  | {
      name: string;
      destinationType: 'INTERNAL';
      internalPath: string;
      openInNewTab: boolean;
    }
  | {
      name: string;
      destinationType: 'EXTERNAL';
      externalUrl: string;
      openInNewTab: boolean;
    };

function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(normalizeExternalUrl(value));
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

export function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('//')) return trimmed;
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const quickShortcutFormSharedFields = {
  name: z.string().trim().min(1, 'Name is required').max(60),
  openInNewTab: z.boolean(),
};

export const quickShortcutFormSchema = z.discriminatedUnion('destinationType', [
  z.object({
    ...quickShortcutFormSharedFields,
    destinationType: z.literal('INTERNAL'),
    internalPath: z.string().min(1, 'Select an Elli page'),
    // Hidden destination fields may be unregistered by React Hook Form.
    externalUrl: z.string().optional().default(''),
  }),
  z.object({
    ...quickShortcutFormSharedFields,
    destinationType: z.literal('EXTERNAL'),
    // Hidden destination fields may be unregistered by React Hook Form.
    internalPath: z.string().optional().default(''),
    externalUrl: z
      .string()
      .refine(isSafeExternalUrl, 'Enter a valid HTTP or HTTPS link without embedded credentials'),
  }),
]);

export type QuickShortcutFormInput = z.input<typeof quickShortcutFormSchema>;
export type QuickShortcutFormValues = z.output<typeof quickShortcutFormSchema>;
