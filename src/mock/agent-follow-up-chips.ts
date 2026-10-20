import type { UIMessage } from 'ai';
import { z } from 'zod';

import { PROPOSAL_TOOLS } from './agent-activity';
import { getSilencedTextParts } from './agent-follow-up';
import { pendingQuestion } from './agent-question';

/**
 * Follow-up chips (elli-ui#1035): what the reader might ask Elliot next, read
 * off the conversation by `POST /mock/agent/follow-ups` once an answer has
 * finished, and drawn above the chat box. A chip is a message the reader sends
 * themselves; nothing here proposes or runs anything.
 */

/** Turns the server reads: enough to know the thread of the chat, not all of it. */
export const FOLLOW_UP_TURNS = 8;
const MAX_TURN_CHARS = 4_000;
const MAX_CARD_BODY_CHARS = 800;

export type FollowUpTurn = { role: 'user' | 'assistant'; text: string };

type ToolPartLike = { type: string; state?: string; input?: unknown; output?: unknown };

/**
 * A proposal card as a line the model can read. The model has to know a card
 * is there and where it stands — a draft waiting for approval wants edits, an
 * approved RFQ wants publishing — and, for a reply, what the draft already
 * says, so it does not suggest asking for something the draft already asks.
 */
export function describeCard(part: ToolPartLike): string | null {
  if (!part.type.startsWith('tool-')) return null;
  const tool = part.type.slice('tool-'.length);
  if (!PROPOSAL_TOOLS.has(tool)) return null;
  const input = (part.input ?? {}) as { summary?: unknown; action?: unknown; body?: unknown };
  const what =
    (typeof input.summary === 'string' && input.summary.trim()) ||
    (typeof input.action === 'string' && input.action.replace(/_/g, ' ')) ||
    'an action';
  const output = typeof part.output === 'string' ? part.output : '';
  const where =
    part.state === 'output-error'
      ? 'it failed'
      : /^SUCCESS\b/.test(output)
        ? 'the user approved it and it was done'
        : /^REJECTED\b/.test(output)
          ? 'the user rejected it'
          : /^REVISE\b/.test(output)
            ? 'the user asked for changes'
            : 'waiting for the user to approve or reject';
  const lines = [`[Card proposed: ${what} — ${where}]`];
  if (input.action === 'reply' && typeof input.body === 'string' && input.body.trim()) {
    const body = input.body.replace(/\s+/g, ' ').trim();
    lines.push(
      `[Reply draft]\n${body.length > MAX_CARD_BODY_CHARS ? `${body.slice(0, MAX_CARD_BODY_CHARS)}…` : body}`
    );
  }
  return lines.join('\n');
}

function messageText(message: UIMessage): string {
  const silenced = getSilencedTextParts(message);
  const pieces: string[] = [];
  message.parts.forEach((part, index) => {
    if (part.type === 'text') {
      if (!silenced.has(index) && part.text.trim()) pieces.push(part.text.trim());
      return;
    }
    const card = describeCard(part as ToolPartLike);
    if (card) pieces.push(card);
  });
  const text = pieces.join('\n');
  return text.length > MAX_TURN_CHARS ? text.slice(0, MAX_TURN_CHARS) : text;
}

/** The last few turns as plain text, oldest first; empty turns are left out. */
export function toFollowUpTurns(messages: readonly UIMessage[]): FollowUpTurn[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role as FollowUpTurn['role'],
      text: messageText(message),
    }))
    .filter((turn) => turn.text)
    .slice(-FOLLOW_UP_TURNS);
}

/**
 * The answer the chips follow, or null while there is none to follow: Elliot
 * still writing, a chat that ends with the reader's own message, or an answer
 * with nothing in it. Chips are keyed by this, so each answer asks once and a
 * newer answer replaces them.
 *
 * Not the message id alone. Deciding a card makes Elliot carry on in the same
 * assistant message, so the id stays put while the answer under it changes —
 * keyed by id, the chips offered for "waiting for approval" would still be up
 * after the approval. The parts and each card's state are part of the key.
 */
export function followUpAnchor(
  status: 'submitted' | 'streaming' | 'ready' | 'error',
  messages: readonly UIMessage[]
): string | null {
  if (status !== 'ready') return null;
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant' || !messageText(last)) return null;
  // An open question offers its own choices; suggestions would compete with them.
  if (pendingQuestion(last)) return null;
  const cards = last.parts
    .map((part) => (part as ToolPartLike).state ?? '')
    .filter(Boolean)
    .join(',');
  return `${last.id}:${last.parts.length}:${cards}`;
}

const responseSchema = z.object({ followUps: z.array(z.string()).default([]) });

/** The server's answer, as strings the chips can show; anything else is none. */
export function toFollowUps(raw: unknown): string[] {
  const parsed = responseSchema.safeParse(raw);
  if (!parsed.success) return [];
  return [...new Set(parsed.data.followUps.map((text) => text.trim()).filter(Boolean))].slice(0, 3);
}
