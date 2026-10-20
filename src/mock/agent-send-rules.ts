import type { UIMessage } from 'ai';

import { getActivitySteps } from './agent-activity';
import { ASK_TOOL_NAME, pendingQuestion } from './agent-question';
import { RECORD_TOOL_NAME } from './record-actions';

type Status = 'submitted' | 'streaming' | 'ready' | 'error';

function isUnansweredTool(part: UIMessage['parts'][number]): boolean {
  if (!part || typeof part !== 'object' || !('type' in part)) return false;
  if (typeof part.type !== 'string' || !part.type.startsWith('tool-')) return false;
  const state = (part as { state?: string }).state;
  return state !== 'output-available' && state !== 'output-error';
}

/** The message is an Elliot turn with a card still waiting for a decision. */
export function awaitsDecision(message: UIMessage | undefined): boolean {
  return message?.role === 'assistant' && message.parts.some(isUnansweredTool);
}

/**
 * Why nothing new can be sent right now, or null. A card waiting for approval
 * must be answered first: the SDK only writes a tool result into the last
 * message, so a message sent over a pending card leaves that card unanswerable
 * and the server rejects the turn.
 */
export function sendBlockedReason(
  status: Status,
  lastMessage: UIMessage | undefined
): string | null {
  if (status === 'submitted' || status === 'streaming') return 'Elliot is still working.';
  if (pendingQuestion(lastMessage)) return 'Answer Elliot’s question first.';
  if (awaitsDecision(lastMessage)) return 'Approve or reject the pending action first.';
  return null;
}

/**
 * Whether Enter in the composer should be held rather than submitted. While
 * Elliot is still working nothing can be sent, and submitting would clear
 * the box anyway, losing what the reader typed. Held, it waits to be sent.
 */
export function holdsEnterWhileRunning(status: Status): boolean {
  return status === 'submitted' || status === 'streaming';
}

/**
 * A message went out over a pending card and failed. Dropping it puts the
 * card last again, where its buttons work.
 */
export function failedMessageCoversPendingCard(messages: UIMessage[]): boolean {
  const last = messages[messages.length - 1];
  return last?.role === 'user' && awaitsDecision(messages[messages.length - 2]);
}

const REVISE_PREFIX = 'REVISE: ';

/** The tool result that tells Elliot the user wants the proposal changed. */
export function reviseOutput(request: string): string {
  return `${REVISE_PREFIX}${request}`;
}

export function isReviseOutput(output: string | undefined): boolean {
  return output?.startsWith(REVISE_PREFIX) === true;
}

/**
 * Typing while a card waits is a request to change it, not a new topic. Every
 * unanswered card in the last Elliot turn is answered with the request, so
 * the conversation can go on and Elliot can propose a new version.
 */
export function withPendingRevised(messages: UIMessage[], request: string): UIMessage[] {
  const last = messages[messages.length - 1];
  if (!awaitsDecision(last)) return messages;
  const revised: UIMessage = {
    ...last!,
    parts: last!.parts.map((part) =>
      isUnansweredTool(part)
        ? ({ ...part, state: 'output-available', output: reviseOutput(request) } as typeof part)
        : part
    ),
  };
  return [...messages.slice(0, -1), revised];
}

/**
 * "All of them" works through the threads one at a time: each gets its own
 * proposal, and the next is sent only once the current one is decided and
 * Elliot has finished replying. `sentAt` is the message count when the
 * current step went out, so a step is never advanced before its answer lands.
 */
export type ActionQueue = {
  /** Shown in the progress line. */
  label: string;
  /** The prompt for one thread, with `{email}` to fill. */
  template: string;
  threadIds: string[];
  index: number;
  sentAt: number;
};

export function queueStep(
  queue: ActionQueue,
  status: Status,
  messages: UIMessage[]
): 'wait' | 'advance' | 'done' {
  if (status !== 'ready') return 'wait';
  // The step's own turn: the user message and at least one Elliot message.
  if (messages.length < queue.sentAt + 2) return 'wait';
  const last = messages[messages.length - 1];
  if (last?.role !== 'assistant' || awaitsDecision(last)) return 'wait';
  // Elliot needs an answer about this one before the next goes out.
  if (elliotAskedQuestion(last)) return 'wait';
  return queue.index + 1 < queue.threadIds.length ? 'advance' : 'done';
}

function messageText(message: UIMessage | undefined): string {
  return (
    message?.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim() ?? ''
  );
}

/** Elliot's last turn ended on a question, so the next thing typed answers it. */
export function elliotAskedQuestion(message: UIMessage | undefined): boolean {
  return message?.role === 'assistant' && /\?\s*$/.test(messageText(message));
}

const SMALL_TALK =
  /^(all|both|each|every ?one|yes|yeah|yep|y|no|nope|n|ok|okay|k|sure|fine|go|go ahead|do it|proceed|continue|next|skip|stop|cancel|never ?mind|thanks|thank you|thx|hi|hello|hey|please|done|good|great|perfect|cool|nice)[.!]*$/i;

/**
 * Whether typed text is a request to act on an email, as opposed to an answer
 * or an aside. Only a request is worth asking "which email?" about, and only
 * a request should start a run through every thread.
 */
export function isEmailRequest(text: string, lastMessage: UIMessage | undefined): boolean {
  const trimmed = text.trim();
  if (!trimmed || /@\S/.test(trimmed)) return false;
  if (SMALL_TALK.test(trimmed)) return false;
  if (elliotAskedQuestion(lastMessage)) return false;
  return true;
}

const MAIL_VERBS =
  /\b(reply|respond|answer|archive|delete|trash|move|tag|label|forward|summari[sz]e|mark (as )?(read|unread)|draft|close|reopen)\b/i;

/**
 * A request that can only be about a mail ("reply", "archive it") when there
 * is no mail in the chat. Sent as is, Elliot reaches back into the
 * conversation and picks one it saw earlier; better to ask for a thread.
 */
export function needsAThread(text: string, threadCount: number): boolean {
  return threadCount === 0 && MAIL_VERBS.test(text) && !/@\S/.test(text);
}

type Part = UIMessage['parts'][number];

/** The parts the panel draws as a card: a proposal to approve, or a question. */
const CARD_PARTS = new Set<string>([
  'tool-proposeEmailAction',
  'tool-proposeProjectScheduleAction',
  'tool-proposeUploadRfqQuote',
  `tool-${RECORD_TOOL_NAME}`,
  `tool-${ASK_TOOL_NAME}`,
]);

function isCard(part: Part): boolean {
  return !!part && typeof part === 'object' && 'type' in part && CARD_PARTS.has(part.type);
}

function isDecided(part: Part): boolean {
  const state = (part as { state?: string }).state;
  return state === 'output-available' || state === 'output-error';
}

/** Text or a card: something the reader can see. */
export function hasVisibleContent(parts: readonly Part[]): boolean {
  return parts.some((part) => {
    if (!part || typeof part !== 'object' || !('type' in part)) return false;
    if (part.type === 'text') return !!(part as { text?: string }).text;
    return isCard(part);
  });
}

/**
 * The stretch of Elliot's turn since the reader last answered a question or a
 * card. Answering carries the same assistant message on, so the parts above the
 * answer are already on screen and say nothing about whether Elliot has
 * started on what comes next.
 */
function partsSinceLastDecision(message: UIMessage): readonly Part[] {
  const parts = message.parts;
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]!;
    if (isCard(part) && isDecided(part)) return parts.slice(index + 1);
  }
  return parts;
}

/**
 * Whether to show the "thinking" line under the chat. It stays until the turn
 * in progress has something of its own on screen: text, a card, or a lookup
 * timeline, which carries the progress itself.
 */
export function shouldShowThinkingIndicator({
  status,
  messages,
}: {
  status: Status;
  messages: readonly UIMessage[];
}): boolean {
  if (status === 'ready' || status === 'error') return false;
  if (status === 'submitted') return true;
  const last = messages[messages.length - 1];
  if (!last || last.role === 'user') return true;
  const current = partsSinceLastDecision(last);
  if (getActivitySteps({ ...last, parts: [...current] }).length > 0) return false;
  return !hasVisibleContent(current);
}
