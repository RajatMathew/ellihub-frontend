import type { UIMessage } from 'ai';

/**
 * Elliot stopping mid-task to ask the reader something (elli-ui#1368).
 *
 * `askUser` in elli-core (`src/modules/assistant/routes.ts`) has no `execute`:
 * the call lands here as a card with the question and its options. The pick
 * goes back as the call's result, and `sendAutomaticallyWhen` carries the same
 * turn on — so "which RFQ?" is answered and the PO gets built, rather than the
 * turn ending on a question and the task having to be asked for again.
 */

export const ASK_TOOL_NAME = 'askUser';

export type AgentQuestionOption = { label: string; detail?: string };

export type AgentQuestion = { question: string; options: AgentQuestionOption[] };

export type AgentQuestionPart = {
  type: `tool-${typeof ASK_TOOL_NAME}`;
  toolCallId: string;
  state: string;
  input?: Partial<AgentQuestion>;
  output?: unknown;
};

const ANSWER_PREFIX = 'ANSWER: ';

/** The tool result that carries the reader's answer back to Elliot. */
export function answerOutput(answer: string): string {
  return `${ANSWER_PREFIX}${answer.trim()}`;
}

/** What the reader answered, or null while the question is open. */
export function readAnswer(part: Pick<AgentQuestionPart, 'state' | 'output'>): string | null {
  if (part.state !== 'output-available' || typeof part.output !== 'string') return null;
  return part.output.startsWith(ANSWER_PREFIX)
    ? part.output.slice(ANSWER_PREFIX.length)
    : part.output;
}

export function isQuestionPart(part: { type: string }): part is AgentQuestionPart {
  return part.type === `tool-${ASK_TOOL_NAME}`;
}

/**
 * The question as far as it has streamed. Options without a label are dropped;
 * until the question itself has arrived there is nothing to show.
 */
export function readQuestion(input: unknown): AgentQuestion | null {
  if (!input || typeof input !== 'object') return null;
  const { question, options } = input as { question?: unknown; options?: unknown };
  if (typeof question !== 'string' || !question.trim()) return null;
  const picked = Array.isArray(options)
    ? options.flatMap((option): AgentQuestionOption[] => {
        if (!option || typeof option !== 'object') return [];
        const { label, detail } = option as { label?: unknown; detail?: unknown };
        if (typeof label !== 'string' || !label.trim()) return [];
        return [
          typeof detail === 'string' && detail.trim()
            ? { label: label.trim(), detail: detail.trim() }
            : { label: label.trim() },
        ];
      })
    : [];
  return { question: question.trim(), options: picked };
}

/**
 * The option a Confirm press would send (elli-ui#1462). A pick is only a
 * selection until confirmed, and it counts only while that option is still
 * offered — a label that streamed in differently sends nothing.
 */
export function confirmableAnswer(
  question: AgentQuestion | null,
  selected: string | null
): string | null {
  if (!question || selected === null) return null;
  return question.options.some((option) => option.label === selected) ? selected : null;
}

/** The open question in Elliot's last turn — what the next thing typed answers. */
export function pendingQuestion(message: UIMessage | undefined): AgentQuestionPart | null {
  if (message?.role !== 'assistant') return null;
  for (const part of message.parts) {
    if (!isQuestionPart(part)) continue;
    if (part.state !== 'output-available' && part.state !== 'output-error') return part;
  }
  return null;
}

export type QuestionTextPart =
  | { kind: 'text'; text: string }
  | { kind: 'file'; text: string; stem: string; extension: string };

// A run with no spaces or brackets that ends in a dot and a short extension:
// `00ELLI002_SO_1211231IN_20261014_000.PDF`, `invoice v2.pdf` stays text.
const FILE_NAME = /[^\s()[\]{}"'“”‘’<>]+\.[A-Za-z][A-Za-z0-9]{1,4}(?![A-Za-z0-9])/g;

/**
 * The question split around file names (elli-ui#1519). A long attachment name
 * has no break opportunity, so it pushed the card wider than the panel; the
 * card truncates the stem and keeps the extension, so `.PDF` stays readable.
 */
export function splitFileNames(text: string): QuestionTextPart[] {
  const parts: QuestionTextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(FILE_NAME)) {
    const start = match.index;
    const name = match[0];
    if (start > last) parts.push({ kind: 'text', text: text.slice(last, start) });
    const dot = name.lastIndexOf('.');
    parts.push({ kind: 'file', text: name, stem: name.slice(0, dot), extension: name.slice(dot) });
    last = start + name.length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}
