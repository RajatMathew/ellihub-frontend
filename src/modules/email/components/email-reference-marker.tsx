import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { useEntityReferenceMarker } from '@/app/components/entity-reference-marker';
import type { EntityReferenceApi } from '@/app/components/entity-reference-marker-storage';
import { emailApi } from '@/modules/email/api';
import type { ConnectedEmailTag } from '@/modules/email/api';
import type { EmailReferenceMarkerState } from '@/modules/email/components/email-reference-marker-storage';
import { OtherTagPanel, OtherTagSummary } from '@/modules/email/components/email-reference-marker-parts';
import { Plus } from 'lucide-react';

type EmailReferenceMarkerProps = {
  accountId: string;
  state: EmailReferenceMarkerState;
  messageId?: string;
  tags?: ConnectedEmailTag[];
  keywords?: string[];
  isUpdatingTags?: boolean;
  isCreatingTag?: boolean;
  isSaving?: boolean;
  onToggleTag?: (tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreateTag?: (name: string) => void;
  onChange: (state: EmailReferenceMarkerState) => void;
};

const EMAIL_REFERENCE_API: EntityReferenceApi = {
  listOptions: (params) =>
    emailApi.listReferenceOptions({
      accountId: params.scopeId,
      type: params.type,
      projectId: params.projectId,
      search: params.search,
      size: params.size,
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
  messageId,
  tags = [],
  keywords = [],
  isUpdatingTags = false,
  isCreatingTag = false,
  isSaving,
  onToggleTag,
  onCreateTag,
  onChange,
}: EmailReferenceMarkerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [closedOtherPanelKey, setClosedOtherPanelKey] = useState<string | null>(null);

  const keywordSet = useMemo(
    () => new Set(keywords.map((keyword) => keyword.toLowerCase())),
    [keywords]
  );
  const selectedOtherTags = useMemo(
    () =>
      tags.filter(
        (tag) =>
          keywordSet.has(tag.name.toLowerCase()) || keywordSet.has(tag.providerId.toLowerCase())
      ),
    [keywordSet, tags]
  );

  const marker = useEntityReferenceMarker({
    scopeId: accountId,
    references: state.references,
    onChange: (references) => onChange({ ...state, references }),
    api: EMAIL_REFERENCE_API,
    isSaving,
    otherModeExtra: (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 rounded-md border border-dashed border-border bg-background text-muted-foreground hover:text-foreground"
          disabled={isSaving}
          aria-label="Add tag category"
          onClick={() => setClosedOtherPanelKey(null)}
        >
          <Plus aria-hidden="true" className="size-3.5" />
        </Button>
        {selectedOtherTags.length > 0 && (
          <OtherTagSummary
            tags={selectedOtherTags}
            disabled={isUpdatingTags || isSaving}
            onRemove={onToggleTag ? (tag) => onToggleTag(tag, false) : undefined}
          />
        )}
      </>
    ),
  });

  const showOtherTagPanel =
    marker.isOtherSelected &&
    selectedOtherTags.length === 0 &&
    closedOtherPanelKey !== state.conversationKey;

  const submitNewTag = () => {
    const name = newTagName.replace(/\s+/g, ' ').trim();
    if (!name || !onCreateTag) return;
    onCreateTag(name);
    setNewTagName('');
    setClosedOtherPanelKey(state.conversationKey);
  };

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

  const otherTagPanel =
    showOtherTagPanel && !marker.isProjectMode ? (
      <OtherTagPanel
        tags={tags}
        keywordSet={keywordSet}
        messageId={messageId}
        newTagName={newTagName}
        isUpdatingTags={isUpdatingTags}
        isCreatingTag={isCreatingTag}
        onNewTagNameChange={setNewTagName}
        onSubmitNewTag={submitNewTag}
        onToggleTag={
          onToggleTag
            ? (tag, enabled) => {
                onToggleTag(tag, enabled);
                setClosedOtherPanelKey(state.conversationKey);
              }
            : undefined
        }
        onCreateTag={onCreateTag}
        onDismiss={() => setClosedOtherPanelKey(state.conversationKey)}
      />
    ) : null;

  return { ...marker, otherTagPanel };
}

function isEditableKeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
