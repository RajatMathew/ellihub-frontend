import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input } from '@/app/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import { emailApi } from '@/modules/email/api';
import type { ConnectedEmailTag } from '@/modules/email/api';
import {
  EMAIL_REFERENCE_TYPES,
  EMAIL_THREAD_STATE_LABELS,
  isOpenEmailThreadState,
  type EmailReference,
  type EmailReferenceMarkerState,
  type EmailReferenceOption,
  type EmailReferenceType,
  type EmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AtSign,
  CheckCircle2,
  ChevronDown,
  CircleDotDashed,
  Info,
  Loader2,
  Plus,
  Tag,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

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

type EmailThreadStatusMarkerProps = {
  state: EmailThreadState;
  isSaving?: boolean;
  onChange: (state: EmailThreadState) => void;
};

type EmailReferenceFilterType = 'all' | EmailReferenceType;

const SEARCHABLE_REFERENCE_TYPES: Array<Exclude<EmailReferenceType, 'rfi' | 'other'>> = [
  'project',
  'rfq',
  'purchaseOrder',
  'changeOrder',
  'invoice',
];

function normalizeReferenceTimeline(references: EmailReference[]) {
  const seenReferences = new Set<string>();
  const uniqueReferences: EmailReference[] = [];

  for (const reference of references) {
    if (reference.type === 'other') return [{ ...reference, sortOrder: 0 }];
    const key = getReferenceIdentity(reference);
    if (seenReferences.has(key)) continue;
    seenReferences.add(key);
    uniqueReferences.push(reference);
  }

  return uniqueReferences.map((reference, index) => ({ ...reference, sortOrder: index }));
}

export function EmailReferenceMarker({
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
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EmailReferenceFilterType>('all');
  const [newTagName, setNewTagName] = useState('');
  const [closedOtherPanelKey, setClosedOtherPanelKey] = useState<string | null>(null);
  const selectedProjectIds = useMemo(
    () => [
      ...new Set(
        state.references
          .filter((reference) => reference.type === 'project')
          .map((reference) => reference.entityId)
          .filter((projectId): projectId is string => Boolean(projectId))
      ),
    ],
    [state.references]
  );
  const references = useMemo(
    () => normalizeReferenceTimeline(state.references),
    [state.references]
  );
  const isOtherSelected = references.some((reference) => reference.type === 'other');
  const hasProjectReference = references.some((reference) => reference.type === 'project');
  const isProjectMode = !isOtherSelected;
  const effectiveSelectedType =
    isOtherSelected && selectedType !== 'other' ? 'other' : selectedType;
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
  const showOtherTagPanel =
    isOtherSelected &&
    selectedOtherTags.length === 0 &&
    closedOtherPanelKey !== state.conversationKey;
  const getChipValue = useCallback(
    (reference: EmailReference) => getReferenceIdentity(reference),
    []
  );

  const updateReferences = (next: EmailReference[]) => {
    onChange({
      ...state,
      references: normalizeReferenceTimeline(next),
    });
  };

  const removeReference = (reference: EmailReference) => {
    const value = getChipValue(reference);
    const isLastProjectReference =
      reference.type === 'project' &&
      !references.some((item) => item.type === 'project' && getChipValue(item) !== value);
    const hasDependentReferences = references.some((item) => item.type !== 'project');

    if (isLastProjectReference && hasDependentReferences) {
      toast.warning('Cannot remove the project reference', {
        description:
          'Remove the RFQ, PO, invoice, and change-order references first, then remove the project.',
      });
      return;
    }

    updateReferences(state.references.filter((item) => getChipValue(item) !== value));
  };

  const addReference = (reference: EmailReference) => {
    if (reference.type !== 'project' && !hasProjectReference) {
      setSelectedType('project');
      setOpen(true);
      return;
    }
    if (reference.type === 'other') {
      if (isOtherSelected) {
        // Toggle 'Other' off and fall back to project selection mode.
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

  const setCategoryMode = (mode: 'project' | 'other') => {
    if (mode === 'other') {
      updateReferences([{ type: 'other', entityType: null, entityId: null, label: 'Other' }]);
      setSelectedType('other');
      setClosedOtherPanelKey(null);
      return;
    }

    if (isOtherSelected) updateReferences([]);
    setSelectedType('all');
    setClosedOtherPanelKey(null);
  };

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
      setOpen(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="mt-3 min-w-0" aria-label="References">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <CategorySegmentedControl
          value={isProjectMode ? 'project' : 'other'}
          disabled={isSaving}
          onChange={setCategoryMode}
        />

        {!isProjectMode && (
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
                onRemove={
                  onToggleTag
                    ? (tag) => {
                        onToggleTag(tag, false);
                      }
                    : undefined
                }
              />
            )}
          </>
        )}

        {isProjectMode && (
          <ReferenceGroups references={references} isSaving={isSaving} onRemove={removeReference} />
        )}

        {isProjectMode && (
          <Popover
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (nextOpen && !hasProjectReference) setSelectedType('project');
            }}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant={references.length > 0 ? 'ghost' : 'outline'}
                size={references.length > 0 ? 'icon' : 'sm'}
                className={cn(
                  'shrink-0 bg-background text-xs',
                  references.length > 0
                    ? 'size-8 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground'
                    : 'min-h-8 gap-1.5 rounded-md px-3'
                )}
                disabled={isSaving}
              >
                {references.length > 0 ? (
                  <>
                    <Plus aria-hidden="true" className="size-3.5" />
                    <span className="sr-only">Add reference</span>
                  </>
                ) : (
                  <>
                    <AtSign aria-hidden="true" className="size-3.5 text-primary" />
                    References
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <ReferencePickerPopover
              accountId={accountId}
              align={references.length > 0 ? 'end' : 'start'}
              selectedType={effectiveSelectedType}
              selectedProjectIds={selectedProjectIds}
              selectedReferences={references}
              otherLocked={isOtherSelected}
              projectRequired={!hasProjectReference}
              onSelectedTypeChange={setSelectedType}
              onAdd={addReference}
            />
          </Popover>
        )}
      </div>
      {!isProjectMode && showOtherTagPanel && (
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
      )}
    </section>
  );
}

function OtherTagSummary({
  tags,
  disabled,
  onRemove,
}: {
  tags: ConnectedEmailTag[];
  disabled?: boolean;
  onRemove?: (tag: ConnectedEmailTag) => void;
}) {
  return (
    <span
      className="inline-flex h-9 max-w-full min-w-0 items-center overflow-hidden rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground shadow-xs shadow-black/5"
      title={`Categories: ${tags.map((tag) => tag.name).join(', ')}`}
    >
      <span className="flex min-w-0 items-center overflow-hidden">
        {tags.map((tag, index) => (
          <span key={tag.id} className="inline-flex min-w-0 items-center">
            {index > 0 && <span className="mr-1 text-muted-foreground">,</span>}
            <span className="max-w-36 truncate">{tag.name}</span>
            {onRemove && (
              <BubbleIconButton
                label={`Remove ${tag.name}`}
                disabled={disabled}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onRemove(tag)}
              >
                <X aria-hidden="true" className="size-3" />
              </BubbleIconButton>
            )}
          </span>
        ))}
      </span>
    </span>
  );
}

function CategorySegmentedControl({
  value,
  disabled,
  onChange,
}: {
  value: 'project' | 'other';
  disabled?: boolean;
  onChange: (value: 'project' | 'other') => void;
}) {
  return (
    <div className="inline-flex h-9 shrink-0 overflow-hidden rounded-md border border-border bg-background p-0.5 shadow-xs shadow-black/5">
      {(['project', 'other'] as const).map((item) => (
        <button
          key={item}
          type="button"
          className={cn(
            'inline-flex min-w-20 cursor-pointer items-center justify-center rounded-sm px-3 text-sm font-medium capitalize transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
            value === item
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          )}
          aria-pressed={value === item}
          disabled={disabled}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function ReferencePickerPopover({
  accountId,
  align,
  selectedType,
  selectedProjectIds,
  selectedReferences,
  otherLocked,
  projectRequired,
  onSelectedTypeChange,
  onAdd,
}: {
  accountId: string;
  align: 'start' | 'end';
  selectedType: EmailReferenceFilterType;
  selectedProjectIds: string[];
  selectedReferences: EmailReference[];
  otherLocked: boolean;
  projectRequired: boolean;
  onSelectedTypeChange: (value: EmailReferenceFilterType) => void;
  onAdd: (reference: EmailReference) => void;
}) {
  return (
    <PopoverContent
      align={align}
      side="bottom"
      avoidCollisions={false}
      sideOffset={8}
      collisionPadding={12}
      className="flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[min(28rem,calc(100vw-1.5rem),var(--radix-popover-content-available-width))] flex-col overflow-hidden p-3"
    >
      <Tabs
        value={selectedType}
        onValueChange={(value) => onSelectedTypeChange(value as EmailReferenceFilterType)}
        className="shrink-0"
      >
        <TabsList
          variant="line"
          size="sm"
          className="mb-3 w-full flex-nowrap justify-start gap-4 overflow-x-auto border-b"
          aria-label="Reference type"
        >
          <TabsTrigger
            value="all"
            disabled={otherLocked || projectRequired}
            className="min-h-10 px-1 uppercase tracking-normal"
          >
            All
          </TabsTrigger>
          {EMAIL_REFERENCE_TYPES.filter((item) => item.type !== 'other').map((item) => (
            <TabsTrigger
              key={item.type}
              value={item.type}
              disabled={otherLocked || (projectRequired && item.type !== 'project')}
              className="min-h-10 px-1"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {projectRequired && selectedType === 'project' && (
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-info/15 bg-info-soft/50 px-3 py-2 text-xs text-info-soft-foreground">
            <Info aria-hidden="true" className="size-3.5 shrink-0" />
            <span>You need to select project first.</span>
          </div>
        )}
        <ReferencePicker
          accountId={accountId}
          type={selectedType}
          projectIds={selectedProjectIds}
          placeholder={
            selectedType === 'all'
              ? 'Search all references'
              : (EMAIL_REFERENCE_TYPES.find((item) => item.type === selectedType)?.placeholder ??
                'Add reference')
          }
          selectedReferences={selectedReferences}
          otherLocked={otherLocked}
          projectRequired={projectRequired}
          onAdd={onAdd}
        />
      </div>
    </PopoverContent>
  );
}

function ReferenceGroups({
  references,
  isSaving,
  onRemove,
}: {
  references: EmailReference[];
  isSaving?: boolean;
  onRemove: (reference: EmailReference) => void;
}) {
  const groups = useMemo(() => groupReferencesByType(references), [references]);

  return (
    <>
      {groups.map((group) => (
        <ReferenceGroupChip
          key={group.type}
          type={group.type}
          references={group.references}
          isSaving={isSaving}
          onRemove={onRemove}
        />
      ))}
    </>
  );
}

function ReferenceGroupChip({
  type,
  references,
  isSaving,
  onRemove,
}: {
  type: EmailReferenceType;
  references: EmailReference[];
  isSaving?: boolean;
  onRemove: (reference: EmailReference) => void;
}) {
  const typeLabel = getReferenceGroupLabel(type);

  return (
    <span className="inline-flex h-auto min-h-9 max-w-full min-w-0 flex-wrap items-center rounded-md border border-border bg-background text-sm font-medium shadow-xs shadow-black/5">
      <span className="flex h-9 shrink-0 items-center bg-muted/50 px-3 text-muted-foreground">
        {typeLabel}
      </span>
      <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-y-1 px-2.5 py-1 text-foreground">
        {references.map((reference, index) => (
          <span
            key={getReferenceIdentity(reference)}
            className="group/reference inline-flex min-w-0 items-center"
          >
            {index > 0 && <span className="mr-1 text-muted-foreground">,</span>}
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'max-w-full whitespace-normal break-words sm:max-w-44 sm:truncate',
                    type === 'project' && 'font-semibold text-brand-clay'
                  )}
                >
                  {reference.label}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" showArrow className="max-w-80 whitespace-nowrap">
                {reference.label}
              </TooltipContent>
            </Tooltip>
            <BubbleIconButton
              label={`Remove ${reference.label}`}
              disabled={isSaving}
              className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover/reference:opacity-100 sm:group-focus-within/reference:opacity-100"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onRemove(reference)}
            >
              <X aria-hidden="true" className="size-3" />
            </BubbleIconButton>
          </span>
        ))}
      </span>
    </span>
  );
}

function OtherExclusivePickerNotice() {
  return (
    <div className="rounded-md border border-border bg-muted/25 p-3 text-sm">
      <p className="font-medium text-foreground">Other is exclusive</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Switch back to Project before linking this mail to a project, PO, invoice, RFQ, RFI, or CO.
        Use tags to organize uncategorized mail into provider tag folders.
      </p>
    </div>
  );
}

function ProjectRequiredNotice() {
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
      <p className="font-medium text-foreground">Add a project first</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Link this thread to a project before adding an RFQ, purchase order, invoice, or change
        order.
      </p>
    </div>
  );
}

function OtherTagPanel({
  tags,
  keywordSet,
  messageId,
  newTagName,
  isUpdatingTags,
  isCreatingTag,
  onNewTagNameChange,
  onSubmitNewTag,
  onToggleTag,
  onCreateTag,
  onDismiss,
}: {
  tags: ConnectedEmailTag[];
  keywordSet: Set<string>;
  messageId?: string;
  newTagName: string;
  isUpdatingTags: boolean;
  isCreatingTag: boolean;
  onNewTagNameChange: (value: string) => void;
  onSubmitNewTag: () => void;
  onToggleTag?: (tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreateTag?: (name: string) => void;
  onDismiss: () => void;
}) {
  const createTagInputId = useId();
  const canManageTags = Boolean(messageId && onToggleTag);

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <Tag aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Organize with tags</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Provider tags keep this mail in its tagged folder while Other stays separate from
            project references.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close tag organizer"
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">No provider tags yet.</span>
        ) : (
          tags.map((tag) => {
            const selected =
              keywordSet.has(tag.name.toLowerCase()) ||
              keywordSet.has(tag.providerId.toLowerCase());

            return (
              <button
                key={tag.id}
                type="button"
                className={cn(
                  'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                  selected && 'border-primary/30 bg-primary/10 text-primary'
                )}
                aria-pressed={selected}
                disabled={!canManageTags || isUpdatingTags}
                onClick={() => onToggleTag?.(tag, !selected)}
              >
                {selected && <CommandCheck aria-hidden="true" className="ms-0 size-3.5" />}
                <span className="max-w-36 truncate">{tag.name}</span>
              </button>
            );
          })
        )}
      </div>

      {onCreateTag && (
        <form
          className="mt-3 flex max-w-sm gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitNewTag();
          }}
        >
          <label htmlFor={createTagInputId} className="sr-only">
            Create and apply tag
          </label>
          <Input
            id={createTagInputId}
            type="text"
            variant="sm"
            className="h-9"
            value={newTagName}
            placeholder="Create and apply tag"
            disabled={isCreatingTag}
            onChange={(event) => onNewTagNameChange(event.target.value)}
          />
          <Button
            type="submit"
            variant="outline"
            mode="icon"
            size="icon"
            className="size-9 shrink-0"
            disabled={!newTagName.trim() || isCreatingTag || !messageId}
          >
            <Plus aria-hidden="true" className="size-4" />
            <span className="sr-only">Create and apply tag</span>
          </Button>
        </form>
      )}
    </div>
  );
}

export function EmailThreadStatusMarker({
  state,
  isSaving,
  onChange,
}: EmailThreadStatusMarkerProps) {
  const isOpen = isOpenEmailThreadState(state);

  return (
    <div className="shrink-0">
      <div className="inline-flex rounded-full border border-border bg-muted/30 p-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                isOpen && 'bg-destructive/10 text-destructive shadow-xs'
              )}
              aria-pressed={isOpen}
              disabled={isSaving}
            >
              <CircleDotDashed aria-hidden="true" className="size-3" />
              {isOpen ? EMAIL_THREAD_STATE_LABELS[state] : 'Open'}
              <ChevronDown aria-hidden="true" className="size-2.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 p-1">
            <DropdownMenuRadioGroup
              value={isOpen ? state : ''}
              onValueChange={(value) => onChange(value as EmailThreadState)}
            >
              <DropdownMenuRadioItem value="open" className="min-h-8 text-xs">
                Open
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="open_our_court" className="min-h-8 text-xs">
                Open · our court
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="open_their_court" className="min-h-8 text-xs">
                Open · their court
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThreadStateButton
          active={state === 'closed'}
          state="closed"
          label="Closed"
          icon={CheckCircle2}
          disabled={isSaving}
          onClick={() => onChange('closed')}
        />
      </div>
    </div>
  );
}

export function EmailThreadStatusPill({ state }: { state: EmailThreadState }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[0.6875rem] font-semibold',
        isOpenEmailThreadState(state)
          ? 'bg-destructive/10 text-destructive'
          : 'bg-success-soft text-success-soft-foreground'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          isOpenEmailThreadState(state) ? 'bg-destructive' : 'bg-success-accent'
        )}
      />
      {EMAIL_THREAD_STATE_LABELS[state]}
    </span>
  );
}

function ReferencePicker({
  accountId,
  type,
  projectIds,
  placeholder,
  selectedReferences,
  otherLocked,
  projectRequired,
  onAdd,
}: {
  accountId: string;
  type: EmailReferenceFilterType;
  projectIds: string[];
  placeholder: string;
  selectedReferences: EmailReference[];
  otherLocked: boolean;
  projectRequired: boolean;
  onAdd: (reference: EmailReference) => void;
}) {
  if (otherLocked && type !== 'other') {
    return <OtherExclusivePickerNotice />;
  }
  if (projectRequired && type !== 'project') {
    return <ProjectRequiredNotice />;
  }

  if (type === 'all') {
    return (
      <AllReferencePicker
        accountId={accountId}
        projectIds={projectIds}
        placeholder={placeholder}
        selectedReferences={selectedReferences}
        onAdd={onAdd}
      />
    );
  }

  if (type === 'other') {
    return (
      <button
        type="button"
        className={cn(
          'flex min-h-10 w-full cursor-pointer items-center justify-between rounded-sm px-2 text-left text-sm hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          selectedReferences.some((reference) => reference.type === 'other') &&
            'bg-primary/10 text-primary'
        )}
        onClick={() => onAdd({ type: 'other', entityType: null, entityId: null, label: 'Other' })}
      >
        <span>Mark as Other</span>
        {selectedReferences.some((reference) => reference.type === 'other') ? (
          <CommandCheck aria-hidden="true" />
        ) : (
          <Plus aria-hidden="true" className="size-4 text-muted-foreground" />
        )}
      </button>
    );
  }

  if (type === 'rfi') {
    return <ManualReferencePicker type={type} placeholder={placeholder} onAdd={onAdd} />;
  }

  return (
    <SearchReferencePicker
      accountId={accountId}
      type={type}
      projectIds={projectIds}
      placeholder={placeholder}
      selectedReferences={selectedReferences}
      onAdd={onAdd}
    />
  );
}

function AllReferencePicker({
  accountId,
  projectIds,
  placeholder,
  selectedReferences,
  onAdd,
}: {
  accountId: string;
  projectIds: string[];
  placeholder: string;
  selectedReferences: EmailReference[];
  onAdd: (reference: EmailReference) => void;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 200);
  const optionsQuery = useQuery({
    queryKey: [
      'connected-email',
      'reference-options',
      accountId,
      'all',
      projectIds,
      debouncedSearch,
    ],
    queryFn: async () => {
      const optionGroups = await Promise.all(
        SEARCHABLE_REFERENCE_TYPES.flatMap((type) =>
          (type === 'project' ? [undefined] : projectIds).map(async (projectId) => {
            const options = await emailApi.listReferenceOptions({
              accountId,
              type,
              projectId,
              search: debouncedSearch || undefined,
              size: 20,
            });
            return options.map((option) => ({
              ...option,
              groupLabel: getReferenceTypeLabel(type),
            }));
          })
        )
      );

      return dedupeReferenceOptions(optionGroups.flat());
    },
    staleTime: 60 * 1000,
    // Keep showing the last successful result while a new project selection
    // re-scopes the query, instead of dropping to a bare loading state and
    // wiping the list on every click in the popover.
    placeholderData: keepPreviousData,
    enabled: Boolean(accountId) && projectIds.length > 0,
  });
  const options = useMemo(
    () =>
      withSelectedOptionsPinned(
        optionsQuery.data ?? [],
        selectedReferences,
        SEARCHABLE_REFERENCE_TYPES,
        debouncedSearch,
        getReferenceTypeLabel
      ),
    [optionsQuery.data, selectedReferences, debouncedSearch]
  );
  // isPending (no data at all yet) rather than isLoading/isFetching — the
  // latter would also flip true on background refetches after a selection.
  const showLoading = optionsQuery.isPending;

  return (
    <Command shouldFilter={false} className="min-h-0 flex-1">
      <CommandInput value={search} placeholder={placeholder} onValueChange={setSearch} />
      <CommandList className="max-h-none min-h-0 flex-1">
        {showLoading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            Loading
          </div>
        ) : options.length === 0 ? (
          <CommandEmpty>No matches found.</CommandEmpty>
        ) : null}
        {options.map((option) => {
          const selected = isOptionSelected(option, selectedReferences);
          return (
            <CommandItem
              key={`${option.type}:${option.entityType}:${option.entityId ?? option.label}`}
              value={`${option.groupLabel} ${option.label} ${option.meta ?? ''}`}
              className={cn(
                'min-h-10 cursor-pointer',
                selected && 'bg-primary/10 text-primary data-[selected=true]:bg-primary/15'
              )}
              onSelect={() => onAdd(optionToReference(option))}
            >
              <span
                className={cn(
                  'mr-2 inline-flex h-6 w-16 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/35 text-[0.6875rem] font-semibold uppercase text-muted-foreground',
                  selected && 'border-primary/25 bg-primary/10 text-primary'
                )}
              >
                {option.groupLabel}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {option.meta && (
                  <span
                    className={cn(
                      'block truncate text-xs text-muted-foreground',
                      selected && 'text-primary/80'
                    )}
                  >
                    {option.meta}
                  </span>
                )}
              </span>
              {selected && <CommandCheck aria-hidden="true" />}
            </CommandItem>
          );
        })}
      </CommandList>
    </Command>
  );
}

function SearchReferencePicker({
  accountId,
  type,
  projectIds,
  placeholder,
  selectedReferences,
  onAdd,
}: {
  accountId: string;
  type: Exclude<EmailReferenceType, 'rfi' | 'other'>;
  projectIds: string[];
  placeholder: string;
  selectedReferences: EmailReference[];
  onAdd: (reference: EmailReference) => void;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 200);
  const optionsQuery = useQuery({
    queryKey: [
      'connected-email',
      'reference-options',
      accountId,
      type,
      // Project options aren't scoped by the selected project(s) — keep
      // projectIds out of this key's identity so selecting a project doesn't
      // spuriously invalidate the already-loaded Project tab.
      type === 'project' ? [] : projectIds,
      debouncedSearch,
    ],
    queryFn: () =>
      Promise.all(
        (type === 'project' ? [undefined] : projectIds).map((projectId) =>
          emailApi.listReferenceOptions({
            accountId,
            type,
            projectId,
            search: debouncedSearch || undefined,
          })
        )
      ).then((optionGroups) => dedupeReferenceOptions(optionGroups.flat())),
    staleTime: 60 * 1000,
    // Keep showing the last successful result while the query re-scopes
    // (e.g. RFQ/PO/CO/Invoice tabs after a project selection changes),
    // instead of dropping to a bare loading state on every click.
    placeholderData: keepPreviousData,
    enabled: Boolean(accountId) && (type === 'project' || projectIds.length > 0),
  });
  const options = useMemo(
    () =>
      withSelectedOptionsPinned(
        optionsQuery.data ?? [],
        selectedReferences,
        [type],
        debouncedSearch,
        getReferenceTypeLabel
      ),
    [optionsQuery.data, selectedReferences, type, debouncedSearch]
  );
  // isPending (no data at all yet) rather than isLoading/isFetching — the
  // latter would also flip true on background refetches after a selection.
  const showLoading = optionsQuery.isPending;
  const createLabel = search.replace(/\s+/g, ' ').trim();
  const hasExactMatch = options.some(
    (option) => option.label.toLowerCase() === createLabel.toLowerCase()
  );
  const canCreateReference = createLabel.length > 0 && !hasExactMatch && !showLoading;

  return (
    <Command shouldFilter={false} className="min-h-0 flex-1">
      <CommandInput value={search} placeholder={placeholder} onValueChange={setSearch} />
      <CommandList className="max-h-none min-h-0 flex-1">
        {showLoading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            Loading
          </div>
        ) : options.length === 0 ? (
          <CommandEmpty>No matches found.</CommandEmpty>
        ) : null}
        {options.map((option) => {
          const selected = isOptionSelected(option, selectedReferences);
          return (
            <CommandItem
              key={`${option.type}:${option.entityType}:${option.entityId ?? option.label}`}
              value={`${option.label} ${option.meta ?? ''}`}
              className={cn(
                'min-h-10 cursor-pointer',
                selected && 'bg-primary/10 text-primary data-[selected=true]:bg-primary/15'
              )}
              onSelect={() => onAdd(optionToReference(option))}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {option.meta && (
                  <span
                    className={cn(
                      'block truncate text-xs text-muted-foreground',
                      selected && 'text-primary/80'
                    )}
                  >
                    {option.meta}
                  </span>
                )}
              </span>
              {selected && <CommandCheck aria-hidden="true" />}
            </CommandItem>
          );
        })}
        {canCreateReference && (
          <CommandItem
            value={`create ${createLabel}`}
            className="min-h-10 cursor-pointer border-t border-border"
            onSelect={() =>
              onAdd({
                type,
                entityType: null,
                entityId: null,
                label: createLabel,
              })
            }
          >
            <Plus aria-hidden="true" className="mr-2 size-3.5 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">Create {getReferenceTypeLabel(type)} reference</span>
              <span className="block truncate text-xs text-muted-foreground">{createLabel}</span>
            </span>
          </CommandItem>
        )}
      </CommandList>
    </Command>
  );
}

function ManualReferencePicker({
  type,
  placeholder,
  onAdd,
}: {
  type: EmailReferenceType;
  placeholder: string;
  onAdd: (reference: EmailReference) => void;
}) {
  const inputId = useId();
  const [value, setValue] = useState('');
  const typeLabel = getReferenceTypeLabel(type);

  return (
    <form
      className="space-y-2 px-1 py-1"
      onSubmit={(event) => {
        event.preventDefault();
        const label = value.replace(/\s+/g, ' ').trim();
        if (!label) return;
        onAdd({ type, entityType: null, entityId: null, label });
        setValue('');
      }}
    >
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        Add {typeLabel}
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          type="text"
          variant="sm"
          className="h-9"
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit" variant="outline" mode="icon" size="icon" className="size-9">
          <Plus aria-hidden="true" className="size-4" />
          <span className="sr-only">Add {typeLabel}</span>
        </Button>
      </div>
    </form>
  );
}

function ThreadStateButton({
  active,
  state,
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  active: boolean;
  state: EmailThreadState;
  icon: typeof CircleDotDashed;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        active &&
          (state === 'open'
            ? 'bg-destructive/10 text-destructive shadow-xs'
            : 'bg-success-soft text-success-soft-foreground shadow-xs')
      )}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </button>
  );
}

function BubbleIconButton({
  label,
  disabled,
  children,
  className,
  onPointerDown,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-25',
        className
      )}
      aria-label={label}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function optionToReference(option: EmailReferenceOption): EmailReference {
  return {
    type: option.type,
    entityType: option.entityType,
    entityId: option.entityId,
    label: option.label,
  };
}

function dedupeReferenceOptions<T extends EmailReferenceOption>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = [option.type, option.entityType ?? 'manual', option.entityId ?? option.label].join(
      '|'
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function referenceToOption(
  reference: EmailReference,
  groupLabel: string
): EmailReferenceOption & { groupLabel: string } {
  return {
    type: reference.type,
    entityType: reference.entityType ?? null,
    entityId: reference.entityId ?? null,
    label: reference.label,
    meta: null,
    groupLabel,
  };
}

/**
 * A page-sized fetch can omit an already-selected item (it may sort outside the
 * first page). Selected references are always shown regardless, pinned first,
 * so a checked item never silently disappears from its own picker.
 */
function withSelectedOptionsPinned<T extends EmailReferenceOption>(
  fetchedOptions: T[],
  selectedReferences: EmailReference[],
  eligibleTypes: readonly EmailReferenceType[],
  search: string,
  getGroupLabel: (type: EmailReferenceType) => string
): T[] {
  const normalizedSearch = search.trim().toLowerCase();
  const missingSelected = selectedReferences
    .filter((reference) => eligibleTypes.includes(reference.type))
    .filter((reference) => !fetchedOptions.some((option) => referencesMatch(reference, option)))
    .filter(
      (reference) => !normalizedSearch || reference.label.toLowerCase().includes(normalizedSearch)
    )
    .map((reference) => referenceToOption(reference, getGroupLabel(reference.type)));

  const merged = dedupeReferenceOptions([...missingSelected, ...fetchedOptions] as T[]);
  return merged.sort((a, b) => {
    const aSelected = isOptionSelected(a, selectedReferences);
    const bSelected = isOptionSelected(b, selectedReferences);
    if (aSelected === bSelected) return 0;
    return aSelected ? -1 : 1;
  });
}

type ReferenceLike = Pick<EmailReference, 'type' | 'entityType' | 'entityId' | 'label'>;

function referencesMatch(a: ReferenceLike, b: ReferenceLike) {
  if (a.type !== b.type) return false;
  if (a.entityId || b.entityId) {
    return a.entityId === b.entityId && (a.entityType ?? null) === (b.entityType ?? null);
  }

  return a.label.toLowerCase() === b.label.toLowerCase();
}

function isOptionSelected(option: EmailReferenceOption, selectedReferences: EmailReference[]) {
  return selectedReferences.some((reference) => referencesMatch(reference, option));
}

function getReferenceIdentity(
  reference: Pick<EmailReference, 'type' | 'entityType' | 'entityId' | 'label'>
) {
  const valueKey = reference.entityId
    ? `id:${reference.entityId}`
    : `label:${reference.label.toLowerCase()}`;
  return [reference.type, reference.entityType ?? 'manual', valueKey].join('|');
}

function groupReferencesByType(references: EmailReference[]) {
  const groups = new Map<EmailReferenceType, EmailReference[]>();
  for (const reference of references) {
    if (reference.type === 'other') continue;
    const bucket = groups.get(reference.type) ?? [];
    bucket.push(reference);
    groups.set(reference.type, bucket);
  }

  return Array.from(groups, ([type, groupReferences]) => ({
    type,
    references: groupReferences,
  }));
}

function getReferenceTypeLabel(type: EmailReferenceType) {
  return EMAIL_REFERENCE_TYPES.find((item) => item.type === type)?.label ?? 'Ref';
}

function getReferenceGroupLabel(type: EmailReferenceType) {
  if (type === 'project') return 'Job';
  return getReferenceTypeLabel(type);
}

function isEditableKeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
