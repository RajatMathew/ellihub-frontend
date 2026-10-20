/**
 * Where an Elliot proposal card is in its life, read from the AI SDK tool part
 * and the panel's in-flight approval. The card's header, chip and buttons all
 * follow from this one value.
 */
export type AgentCardStatus =
  | 'pending'
  | 'working'
  | 'approved'
  | 'rejected'
  /** The user asked for changes instead; Elliot's new version follows. */
  | 'revised'
  | 'failed';

export function agentCardStatus({
  state,
  output,
  processing,
}: {
  state: string;
  output?: string;
  processing: boolean;
}): AgentCardStatus {
  // The approval is in flight; the tool part has not changed state yet.
  if (processing) return 'working';
  if (state === 'output-error') return 'failed';
  if (state === 'output-available') {
    if (output?.startsWith('REJECTED:')) return 'rejected';
    if (output?.startsWith('REVISE:')) return 'revised';
    return 'approved';
  }
  return 'pending';
}
