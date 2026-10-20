import { AgentActionButtons, AgentActionNote, AgentActionResult } from './agent-action-controls';
import { AgentActionShell } from './agent-action-shell';
import { agentCardStatus } from './agent-card-status';
import { RecordActionAttachments } from './record-action-attachments';
import { RecordActionDetails } from './record-action-details';
import {
  recordActionAttachments,
  recordActionBlocker,
  recordActionCopy,
  type RecordAgentAction,
  type RecordAttachment,
} from './record-actions';

const ATTACH_HINTS: Record<RecordAgentAction['action'], string> = {
  create_rfq: 'No backup documents.',
  award_rfq: '',
  create_po: 'No file for this PO.',
  create_sco: 'No change request attached.',
  log_invoice: 'Attach the vendor invoice.',
};

const TITLES: Record<RecordAgentAction['action'], string> = {
  create_rfq: 'Create RFQ',
  award_rfq: 'Award RFQ',
  create_po: 'Create Purchase Order',
  create_sco: 'Create Change Order',
  log_invoice: 'Log Invoice',
};

function withAttachments(
  action: RecordAgentAction,
  attachments: RecordAttachment[]
): RecordAgentAction {
  if (action.action === 'create_rfq') return { ...action, attachments };
  if (action.action === 'award_rfq') return action;
  return { ...action, attachment: attachments[0] ?? null };
}

/**
 * Elliot's proposal to create a record from mail. Nothing is written until the
 * user approves; the card then hands the action back up to run.
 */
export function RecordActionCard({
  action,
  state,
  output,
  errorText,
  processing,
  processingApproved,
  onChange,
  onApprove,
}: {
  action: RecordAgentAction;
  state: string;
  output?: string;
  errorText?: string;
  processing: boolean;
  processingApproved?: boolean;
  onChange: (action: RecordAgentAction) => void;
  onApprove: (approved: boolean) => Promise<void>;
}) {
  const status = agentCardStatus({ state, output, processing });
  const editable = status === 'pending';
  const copy = recordActionCopy(action.action);
  const blocker = recordActionBlocker(action);

  return (
    <AgentActionShell
      title={TITLES[action.action]}
      status={status}
      streaming={state === 'input-streaming'}
      result={
        status === 'approved' || status === 'rejected' ? (
          <AgentActionResult approved={status === 'approved'}>
            {status === 'rejected' ? copy.rejectedLabel : output?.replace(/^SUCCESS:\s*/, '')}
          </AgentActionResult>
        ) : null
      }
      actions={
        status === 'pending' || status === 'working' ? (
          <>
            {blocker && status === 'pending' ? (
              <AgentActionNote tone="warning">{blocker}</AgentActionNote>
            ) : null}
            <AgentActionButtons
              approveLabel={`Approve & ${copy.submitLabel}`}
              processing={processing}
              processingApproved={processingApproved}
              disabled={!!blocker}
              onApprove={onApprove}
            />
          </>
        ) : errorText ? (
          <AgentActionNote tone="error">{errorText}</AgentActionNote>
        ) : null
      }
    >
      <RecordActionDetails action={action} editable={editable} onChange={onChange} />
      {action.action !== 'award_rfq' ? (
        <RecordActionAttachments
          attachments={recordActionAttachments(action)}
          editable={editable}
          multiple={action.action === 'create_rfq'}
          required={action.action === 'log_invoice'}
          emptyHint={ATTACH_HINTS[action.action]}
          onChange={(attachments) => onChange(withAttachments(action, attachments))}
        />
      ) : null}
    </AgentActionShell>
  );
}
