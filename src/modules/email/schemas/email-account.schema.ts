import { z } from 'zod';

export const emailAccountNicknameSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, 'Enter a nickname for this account.')
    .max(60, 'Keep the nickname under 60 characters.')
    .refine((value) => !value.includes('@'), 'Enter only the name before @ellicorp.com.')
    .refine((value) => /[a-z0-9]/i.test(value), 'Use at least one letter or number.'),
});

export type EmailAccountNicknameInput = z.infer<typeof emailAccountNicknameSchema>;

export function getEmailAccountNicknameLocalPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/@ellicorp\.com$/i, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 48);
}
