import {
  Archive,
  BadgeDollarSign,
  CalendarPlus,
  FileDiff,
  FileText,
  Pencil,
  Receipt,
  Send,
  ShoppingCart,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { z } from 'zod';

/**
 * The actions Elliot may suggest for one attached email, keyed the way
 * `elli-core`'s `src/modules/assistant/suggestions.ts` spells them. The server
 * picks keys; this is what each one looks like and says when clicked. A key
 * the client does not know is dropped, so the two can ship apart.
 */
export const SUGGESTION_KEYS = [
  'draft_reply',
  'summarise',
  'create_rfq',
  'upload_quote',
  'award_rfq',
  'publish_rfq',
  'create_po',
  'create_sco',
  'log_invoice',
  'add_schedule',
] as const;
export type SuggestionKey = (typeof SUGGESTION_KEYS)[number];

export type SuggestedAction = {
  key: SuggestionKey;
  label: string;
  icon: LucideIcon;
  /** The chat prompt; `{email}` names the thread, as the rail's actions do. */
  template: string;
  /** Why Elliot picked it, in the server's words. */
  reason: string;
  /** Keyword rules read the mail, or the model did. The chip marks the model's. */
  source: SuggestionSource;
};

export type SuggestionSource = 'rule' | 'model';

const MENU: Record<SuggestionKey, Omit<SuggestedAction, 'key' | 'reason' | 'source'>> = {
  draft_reply: {
    label: 'Draft a reply',
    icon: Pencil,
    template: 'Draft a concise reply to {email}.',
  },
  summarise: { label: 'Summarise thread', icon: FileText, template: 'Summarise {email}.' },
  create_rfq: { label: 'Create RFQ', icon: Send, template: 'Create an RFQ from {email}.' },
  upload_quote: {
    label: 'Add quote to RFQ',
    icon: BadgeDollarSign,
    template: 'Add the quote in {email} to its RFQ.',
  },
  award_rfq: { label: 'Award RFQ', icon: Trophy, template: 'Award the RFQ based on {email}.' },
  publish_rfq: {
    label: 'Publish RFQ',
    icon: Archive,
    template: 'Publish the RFQ and invite the vendors named in {email}.',
  },
  create_po: {
    label: 'Create PO',
    icon: ShoppingCart,
    template: 'Create a purchase order from {email}.',
  },
  create_sco: {
    label: 'Create change order',
    icon: FileDiff,
    template: 'Create a sub change order from {email}.',
  },
  log_invoice: { label: 'Log invoice', icon: Receipt, template: 'Log the invoice in {email}.' },
  add_schedule: {
    label: 'Add schedule entry',
    icon: CalendarPlus,
    template: 'Add a schedule entry from {email}.',
  },
};

const responseSchema = z.object({
  suggestions: z.array(z.object({ key: z.string(), reason: z.string().default('') })).default([]),
});

export const MAX_SUGGESTED = 4;

/**
 * The server's answer as buttons. Unknown keys and repeats are dropped and the
 * list is capped, so whatever the model wrote, the rail shows only actions
 * the app has.
 */
export function toSuggestedActions(
  raw: unknown,
  source: SuggestionSource = 'model'
): SuggestedAction[] {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return [];
  const seen = new Set<string>();
  const out: SuggestedAction[] = [];
  for (const item of parsed.data.suggestions) {
    if (!isSuggestionKey(item.key) || seen.has(item.key)) continue;
    seen.add(item.key);
    out.push({ key: item.key, reason: item.reason.trim(), source, ...MENU[item.key] });
    if (out.length === MAX_SUGGESTED) break;
  }
  return out;
}

function isSuggestionKey(key: string): key is SuggestionKey {
  return (SUGGESTION_KEYS as readonly string[]).includes(key);
}

/** The fixed empty-chat chips, by the key a suggestion would carry for the same thing. */
export function fixedSuggestionKey(label: string): SuggestionKey | null {
  if (/draft/i.test(label)) return 'draft_reply';
  if (/summaris/i.test(label)) return 'summarise';
  return null;
}
