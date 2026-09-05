import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Popover, PopoverTrigger } from '@/app/components/ui/popover';
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
}: UseEntityReferenceMarkerConfig) {
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
      if (references.length > 0) {
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
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <ReferencePickerPopover
        scopeId={scopeId}
        api={api}
        categories={categories}
        align="end"
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

  const chips = (
    <>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <CategorySegmentedControl
          value={isProjectMode ? 'project' : 'other'}
          disabled={isSaving}
          onChange={setCategoryMode}
        />
        {!isProjectMode && otherModeExtra}
      </div>
      {isProjectMode && references.length > 0 && (
        <div className="mt-2 min-w-0">
          <ReferenceGroups references={references} isSaving={isSaving} onRemove={removeReference} />
        </div>
      )}
      <ConfirmDialog
        open={pendingOtherSwitch}
        onOpenChange={setPendingOtherSwitch}
        title="Switch to Other?"
        description="Are you sure you want to switch? Your project references will be deleted."
        confirmLabel="Switch"
        variant="destructive"
        onConfirm={() => {
          switchToOther();
          setPendingOtherSwitch(false);
        }}
      />
    </>
  );

  return {
    trigger,
    chips,
    isProjectMode,
    isOtherSelected,
    hasReferences: references.length > 0,
    references,
    /** Lets a caller open the picker programmatically (e.g. a "@" keyboard shortcut). */
    open,
    setOpen,
  };
}
