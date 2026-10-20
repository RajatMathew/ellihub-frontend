import type { UIMessage } from 'ai';

import { PROPOSAL_TOOLS } from './agent-activity';

/**
 * Which text parts of a turn to leave unshown: what Elliot writes after the
 * reader has already decided a proposal.
 *
 * Approving or rejecting a card adds its outcome and asks the model to carry on
 * (`sendAutomaticallyWhen`), which is what saves the outcome with the
 * conversation — without it, reopening the chat would offer Approve again on a
 * reply that has already gone out. The system prompt asks for "one short
 * confirmation only" in that step, but the model does not always listen: after
 * an approved reply it printed the whole draft again under the card, ending
 * "The draft is ready for your review" about mail that had been sent.
 *
 * The card already says what happened ("Approved", "Rejected"), so the text of
 * the step that follows a decided proposal is not shown — unless that step
 * proposes something new, where the text introduces the new card. A proposal
 * that failed (`output-error`) is not silenced — the model's explanation of a
 * failure is worth reading.
 */

const DECISION = /^(SUCCESS|REJECTED)\b/;

type PartLike = { type: string; state?: string; output?: unknown };

const isProposal = (part: PartLike) =>
  part.type.startsWith('tool-') && PROPOSAL_TOOLS.has(part.type.slice('tool-'.length));

const isDecidedProposal = (part: PartLike) =>
  part.type.startsWith('tool-') &&
  PROPOSAL_TOOLS.has(part.type.slice('tool-'.length)) &&
  part.state === 'output-available' &&
  typeof part.output === 'string' &&
  DECISION.test(part.output);

/** Indexes into `message.parts` of text that follows a decided proposal. */
export function getSilencedTextParts(message: UIMessage): Set<number> {
  const silenced = new Set<number>();
  if (message.role !== 'assistant') return silenced;

  // The turn's parts, cut into model steps at each step-start.
  const steps: Array<Array<{ part: PartLike; index: number }>> = [[]];
  message.parts.forEach((rawPart, index) => {
    const part = rawPart as PartLike;
    if (part.type === 'step-start') steps.push([]);
    else steps[steps.length - 1].push({ part, index });
  });

  steps.forEach((step, stepIndex) => {
    const previous = steps[stepIndex - 1];
    const followsDecision = !!previous?.some(({ part }) => isDecidedProposal(part));
    // A step that proposes something new is not chatter about the old card:
    // its text introduces the new one ("Found it — proposing both together").
    const proposesAgain = step.some(({ part }) => isProposal(part));
    if (!followsDecision || proposesAgain) return;
    for (const { part, index } of step) {
      if (part.type === 'text') silenced.add(index);
    }
  });
  return silenced;
}
