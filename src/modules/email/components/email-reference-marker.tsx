import { useEffect, useMemo } from 'react';

import { useEntityReferenceMarker } from '@/app/components/entity-reference-marker';
import type { EntityReferenceApi } from '@/app/components/entity-reference-marker-storage';
import { emailApi } from '@/modules/email/api';
import type { ConnectedEmailTag } from '@/modules/email/api';
import type { EmailReferenceMarkerState } from '@/modules/email/components/email-reference-marker-storage';
import { MailThreadTags } from '@/modules/email/components/mail-thread-tags';
import { usePendingEmailTagCreates } from '@/modules/email/hooks';

type EmailReferenceMarkerProps = {
  accountId: string;
  state: EmailReferenceMarkerState;
  tags?: ConnectedEmailTag[];
  /** Elli tags applied to this message. Provider categories are not offered here. */
  appliedTags?: string[];
  isUpdatingTags?: boolean;
  isCreatingTag?: boolean;
  isSaving?: boolean;
  onToggleTag?: (tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreateTag?: (name: string) => void;
  onChange: (state: EmailReferenceMarkerState) => void;
  /** Passed straight through — see `useEntityReferenceMarker`. */
  renderTrigger?: (state: { disabled: boolean }) => React.ReactNode;
};

const EMAIL_REFERENCE_API: EntityReferenceApi = {
  listOptions: (params) =>
    emailApi.listReferenceOptions({
      accountId: params.scopeId,
      types: params.types,
      projectIds: params.projectIds,
      search: params.search,
      size: params.size,
      signal: params.signal,
    }),
};

/**
 * Drives the project/RFQ/etc reference tagging for one email thread, plus the
 * "Other" fallback (provider tags), and exposes `trigger`/`chips` separately
 * so the caller can place the "Add reference" button in its own action row
 * while the tagged-reference rows sit below the subject — see
 * `email-reading-pane.tsx`. The actual project/RFQ/PO/CO/invoice tagging
 * logic lives in the reusable `useEntityReferenceMarker`
 * (`@/app/components/entity-reference-marker`); this hook only layers
 * email-specific "Other" behavior (provider tags) on top of it.
 */
export function useEmailReferenceMarker({
  accountId,
  state,
  tags = [],
  appliedTags = [],
  // No longer read — the tag row does not wait on tag requests (see `tagsSection`).
  // isUpdatingTags = false,
  // isCreatingTag = false,
  /**
   * Greys out the switch, the picker and the linked rows. Leave it unset for a
   * caller whose save is optimistic — the value is on screen before the request
   * goes out, so there is nothing to wait for, and disabling reads as a freeze
   * (elli-ui#985). Tag edits are optimistic now too, and no longer gate at all.
   */
  isSaving,
  onToggleTag,
  onCreateTag,
  onChange,
  renderTrigger,
}: EmailReferenceMarkerProps) {
  // Only Elli's own tags are offered here. Outlook/Gmail categories are
  // read-only and belong to the mailbox owner — see zubblehq/elli-ui#652.
  const customTags = useMemo(() => tags.filter((tag) => tag.source === 'custom'), [tags]);
  const creatingTagNames = usePendingEmailTagCreates(accountId);

  const marker = useEntityReferenceMarker({
    renderTrigger,
    // Other clears the assignee, the court and the thread's tasks as well as
    // the linked records, so the thread always gets asked — not only when it
    // happens to have something linked.
    confirmOtherSwitch: true,
    scopeId: accountId,
    references: state.references,
    onChange: (references) => onChange({ ...state, references }),
    api: EMAIL_REFERENCE_API,
    isSaving,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '@' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableKeyTarget(event.target)) return;

      event.preventDefault();
      marker.setOpen(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * The "Other" side of the panel: the tags a thread that is not project work
   * can carry. Three presets are always offered, whatever the mailbox has
   * collected, so the row reads the same on a thread with no tags as on one
   * with ten — and a `+` opens the rest (elli-ui#921).
   */
  const tagsSection = (
    <MailThreadTags
      tags={customTags}
      appliedNames={appliedTags}
      // Not `isUpdatingTags` / `isCreatingTag`: tag edits are optimistic and
      // queued (see `EMAIL_MESSAGE_TAGS_MUTATION_KEY`), so greying the row
      // while one is in flight only stopped someone picking three tags at once.
      // disabled={isUpdatingTags || isCreatingTag || isSaving}
      disabled={isSaving}
      creatingNames={creatingTagNames}
      onToggle={onToggleTag}
      onCreate={onCreateTag}
    />
  );

  /**
   * The same row for project work (elli-ui#1420), with its own presets —
   * Compliance, RFQ Negotiation, Vendor Payment… — and no label of its own:
   * the panel titles it.
   */
  const projectTagsSection = (
    <MailThreadTags
      side="project"
      bordered
      tags={customTags}
      appliedNames={appliedTags}
      disabled={isSaving}
      creatingNames={creatingTagNames}
      onToggle={onToggleTag}
      onCreate={onCreateTag}
    />
  );

  return { ...marker, tagsSection, projectTagsSection };
}

function isEditableKeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
