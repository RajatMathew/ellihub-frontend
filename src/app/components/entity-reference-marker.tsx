import { useCallback, useMemo, useState } from 'react';

import {
  CategorySegmentedControl,
  ReferenceGroups,
  ReferencePickerPopover,
  type EntityReferenceFilterType,
} from '@/app/components/entity-reference-marker-parts';
import {
  ENTITY_REFERENCE_CATEGORIES,
  getReferenceIdentity,
  normalizeReferenceTimeline,
  type EntityReference,
  type EntityReferenceApi,
  type EntityReferenceCategory,
} from '@/app/components/entity-reference-marker-storage';
import { projectReferenceOptionsQuery } from '@/app/components/entity-reference-options-query';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Popover, PopoverTrigger } from '@/app/components/ui/popover';
import { useQueryClient } from '@tanstack/react-query';
import { AtSign } from 'lucide-react';
import { toast } from 'sonner';

export type UseEntityReferenceMarkerConfig = {
  /** The mailbox/account (email) or the equivalent owning scope (tasks) the options are fetched for. */
  scopeId: string;
  references: EntityReference[];
  onChange: (references: EntityReference[]) => void;
  api: EntityReferenceApi;
  /** Defaults to project/RFQ/RFI/PO/CO/invoice — override only for a genuinely different taxonomy. */
  categories?: EntityReferenceCategory[];
  isSaving?: boolean;
  /**
   * Rendered inline in the trigger row, and — while Other is active with
   * nothing else to show — full width below the toggle. Lets a caller (email)
   * layer its own "Other" behavior (provider tags) on top of the generic
   * project/RFQ/etc tagging without this component knowing tags exist.
   */
  otherModeExtra?: React.ReactNode;
  /**
   * Replaces the default "Add reference" button. The mailbox renders a plain
   * text link instead — a bordered button beside a section heading reads as
   * the heaviest thing in a panel that is otherwise all text (elli-ui#921).
   */
  renderTrigger?: (state: { disabled: boolean }) => React.ReactNode;
  /**
   * Confirm the Project → Other switch even when nothing is linked yet.
   *
   * By default the confirmation only appears when there are references to
   * lose. The mailbox clears the assignee, the court and the thread's tasks
   * along with them — none of which this hook can see — so it asks every time.
   */
  confirmOtherSwitch?: boolean;
};

/**
 * Drives the project/RFQ/RFI/PO/CO/invoice ("Project mode") vs free-form
 * ("Other") tagging UI. Returns two independent pieces of markup —
 * `trigger` (the "+ Add reference" button and its picker popover, meant for
 * an action-button row) and `chips` (the segmented Project/Other control and
 * the tagged-reference rows, meant to sit below the subject/title) — plus
 * enough derived state for a caller to layer its own "Other" behavior on top.
 */
export function useEntityReferenceMarker({
  scopeId,
  references: rawReferences,
  onChange,
  api,
  categories = ENTITY_REFERENCE_CATEGORIES,
  isSaving,
  otherModeExtra,
  renderTrigger,
  confirmOtherSwitch = false,
}: UseEntityReferenceMarkerConfig) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EntityReferenceFilterType>('all');
  const [pendingOtherSwitch, setPendingOtherSwitch] = useState(false);

  const selectedProjectIds = useMemo(
    () => [
      ...new Set(
        rawReferences
          .filter((reference) => reference.type === 'project')
          .map((reference) => reference.entityId)
          .filter((projectId): projectId is string => Boolean(projectId))
      ),
    ],
    [rawReferences]
  );
  const references = useMemo(() => normalizeReferenceTimeline(rawReferences), [rawReferences]);
  const isOtherSelected = references.some((reference) => reference.type === 'other');
  const hasProjectReference = references.some((reference) => reference.type === 'project');
  const prefetchProjectOptions = useCallback(() => {
    // Only what the picker is about to ask for. A thread that already has a
    // project opens on the overview tab, whose query is keyed differently, so
    // warming the Project tab there would be the very request this is meant to
    // save. `prefetchQuery` respects staleTime, so hovering repeatedly is free.
    if (!scopeId || hasProjectReference) return;
    void queryClient.prefetchQuery(projectReferenceOptionsQuery(scopeId, api));
  }, [api, hasProjectReference, queryClient, scopeId]);
  const isProjectMode = !isOtherSelected;
  const effectiveSelectedType =
    isOtherSelected && selectedType !== 'other' ? 'other' : selectedType;

  const updateReferences = (next: EntityReference[]) => {
    onChange(normalizeReferenceTimeline(next));
  };

  const removeReference = (reference: EntityReference) => {
    const value = getReferenceIdentity(reference);
    const isLastProjectReference =
      reference.type === 'project' &&
      !references.some((item) => item.type === 'project' && getReferenceIdentity(item) !== value);
    const hasDependentReferences = references.some((item) => item.type !== 'project');

    if (isLastProjectReference && hasDependentReferences) {
      toast.warning('Cannot remove the project reference', {
        description:
          'Remove the RFQ, PO, invoice, and change-order references first, then remove the project.',
      });
      return;
    }

    updateReferences(references.filter((item) => getReferenceIdentity(item) !== value));
  };

  const addReference = (reference: EntityReference) => {
    if (reference.type !== 'project' && !hasProjectReference) {
      setSelectedType('project');
      setOpen(true);
      return;
    }
    if (reference.type === 'other') {
      if (isOtherSelected) {
        updateReferences([]);
        setSelectedType('all');
        return;
      }
      updateReferences([reference]);
      setSelectedType('other');
      return;
    }
    if (isOtherSelected) {
      setSelectedType('other');
      setOpen(true);
      return;
    }

    const exists = references.some(
      (item) => getReferenceIdentity(item) === getReferenceIdentity(reference)
    );
    if (exists) {
      // Clicking an already-selected option toggles it off. removeReference keeps
      // the guard against removing the last project reference while dependents exist.
      removeReference(reference);
      return;
    }

    updateReferences([...references.filter((item) => item.type !== 'other'), reference]);
  };

  const switchToOther = () => {
    updateReferences([{ type: 'other', entityType: null, entityId: null, label: 'Other' }]);
    setSelectedType('other');
  };

  const setCategoryMode = (mode: 'project' | 'other') => {
    if (mode === 'other') {
      // Switching away from Project discards every project/RFQ/PO/etc
      // reference — confirm first when there's actually something to lose.
      if (references.length > 0 || confirmOtherSwitch) {
        setPendingOtherSwitch(true);
        return;
      }
      switchToOther();
      return;
    }

    if (isOtherSelected) updateReferences([]);
    setSelectedType('all');
  };

  const trigger = (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          // Whatever tab a previous session ended on, the picker always
          // reopens on the overview instead of wherever it was left —
          // "ALL" is the useful default for "add one more reference."
          setSelectedType(hasProjectReference ? 'all' : 'project');
        }
      }}
    >
      {/* Warmed on hover and on focus. The options query lives inside the
          popover, so it could not start until the popover was already open —
          the first open of a session always showed an empty list while the
          request it had just started came back. */}
      <PopoverTrigger
        asChild
        onPointerEnter={prefetchProjectOptions}
        onFocus={prefetchProjectOptions}
      >
        {renderTrigger ? (
          renderTrigger({ disabled: Boolean(isSaving) || isOtherSelected })
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-8 shrink-0 gap-1.5 rounded-md bg-background px-3 text-xs"
            disabled={isSaving || isOtherSelected}
          >
            <AtSign aria-hidden="true" className="size-3.5 text-primary" />
            Add reference
          </Button>
        )}
      </PopoverTrigger>
      <ReferencePickerPopover
        scopeId={scopeId}
        api={api}
        categories={categories}
        align="start"
        side="left"
        selectedType={effectiveSelectedType}
        selectedProjectIds={selectedProjectIds}
        selectedReferences={references}
        otherLocked={isOtherSelected}
        projectRequired={!hasProjectReference}
        onSelectedTypeChange={setSelectedType}
        onAdd={addReference}
      />
    </Popover>
  );

  /**
   * The Project/Other switch on its own, and the tagged rows on their own.
   *
   * `chips` below stacks the two, which is what every caller wanted until the
   * mailbox redesign (elli-ui#921) put the switch at the top of its details
   * card and the linked rows further down, under the assignee and the court.
   * Both are returned so a caller can place them independently without
   * reaching past this hook to the parts.
   */
  const categoryControl = (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <CategorySegmentedControl
          value={isProjectMode ? 'project' : 'other'}
          disabled={isSaving}
          onChange={setCategoryMode}
        />
        {!isProjectMode && otherModeExtra}
      </div>
      {/* Rendered with the switch, not with `chips`: a caller that places the
          switch on its own must still get the "this will delete your project
          references" confirmation that switching to Other triggers. */}
      <ConfirmDialog
        open={pendingOtherSwitch}
        onOpenChange={setPendingOtherSwitch}
        title="Switch to Other?"
        description="Are you sure? Your linked items, assignee, court, tasks etc will be cleared."
        confirmLabel="Switch and clear"
        variant="destructive"
        onConfirm={() => {
          switchToOther();
          setPendingOtherSwitch(false);
        }}
      />
    </>
  );

  const referenceList =
    isProjectMode && references.length > 0 ? (
      <ReferenceGroups references={references} isSaving={isSaving} onRemove={removeReference} />
    ) : null;

  const chips = (
    <>
      {categoryControl}
      {referenceList && <div className="mt-2 min-w-0">{referenceList}</div>}
    </>
  );

  return {
    trigger,
    chips,
    categoryControl,
    referenceList,
    /** The normalized rows, for a caller that draws its own list. */
    references,
    removeReference,
    isProjectMode,
    isOtherSelected,
    hasReferences: references.length > 0,
    /** Lets a caller open the picker programmatically (e.g. a "@" keyboard shortcut). */
    open,
    setOpen,
  };
}
