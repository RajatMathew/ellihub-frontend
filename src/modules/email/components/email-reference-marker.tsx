import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Input } from '@/app/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import { emailApi } from '@/modules/email/api';
import type { ConnectedEmailTag } from '@/modules/email/api';
import {
  EMAIL_REFERENCE_TYPES,
  type EmailReference,
  type EmailReferenceMarkerState,
  type EmailReferenceOption,
  type EmailReferenceType,
  type EmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import { AtSign, CheckCircle2, CircleDotDashed, Loader2, Plus, Tag, X } from 'lucide-react';

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
  const seenTypes = new Set<EmailReferenceType>();
  const uniqueReferences: EmailReference[] = [];

  for (const reference of references) {
    if (seenTypes.has(reference.type)) continue;
    seenTypes.add(reference.type);
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
  const selectedProjectId = useMemo(
    () => state.references.find((reference) => reference.type === 'project')?.entityId ?? undefined,
    [state.references]
  );
  const references = useMemo(() => {
    const projectReferences = state.references.filter((reference) => reference.type === 'project');
    const otherReferences = state.references.filter((reference) => reference.type !== 'project');
    return normalizeReferenceTimeline([...projectReferences, ...otherReferences]);
  }, [state.references]);
  const isOtherSelected = references.some((reference) => reference.type === 'other');
  const effectiveSelectedType =
    isOtherSelected && selectedType !== 'other' ? 'other' : selectedType;
  const keywordSet = useMemo(
    () => new Set(keywords.map((keyword) => keyword.toLowerCase())),
    [keywords]
  );
  const getChipValue = useCallback(
    (reference: EmailReference) =>
      `${reference.type}:${reference.entityType ?? 'manual'}:${reference.entityId ?? reference.label}`,
    []
  );

  const updateReferences = (next: EmailReference[]) => {
    const projectReferences = next.filter((reference) => reference.type === 'project');
    const otherReferences = next.filter((reference) => reference.type !== 'project');
    onChange({
      ...state,
      references: normalizeReferenceTimeline([...projectReferences, ...otherReferences]),
    });
  };

  const removeReference = (reference: EmailReference) => {
    const value = getChipValue(reference);
    updateReferences(state.references.filter((item) => getChipValue(item) !== value));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeIndex = references.findIndex((reference) => getChipValue(reference) === active.id);
    const overIndex = references.findIndex((reference) => getChipValue(reference) === over.id);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return;
    updateReferences(arrayMove(references, activeIndex, overIndex));
  };

  const addReference = (reference: EmailReference) => {
    if (reference.type === 'other') {
      updateReferences([reference]);
      setSelectedType('other');
      setOpen(false);
      return;
    }
    if (isOtherSelected) {
      setSelectedType('other');
      setOpen(true);
      return;
    }

    const existingIndex = state.references.findIndex((item) => item.type === reference.type);
    const exists = state.references.some(
      (item) =>
        item.type === reference.type &&
        (item.entityId || item.label.toLowerCase()) ===
          (reference.entityId || reference.label.toLowerCase())
    );
    if (exists) return;

    if (existingIndex >= 0) {
      const next = [...state.references];
      next[existingIndex] = reference;
      updateReferences(next);
    } else {
      updateReferences([...state.references, reference]);
    }
    setOpen(false);
  };

  const submitNewTag = () => {
    const name = newTagName.replace(/\s+/g, ' ').trim();
    if (!name || !onCreateTag) return;
    onCreateTag(name);
    setNewTagName('');
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
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={references.map(getChipValue)} strategy={rectSortingStrategy}>
              {references.map((reference) => (
                <ReferenceChip
                  key={getChipValue(reference)}
                  reference={reference}
                  isSaving={isSaving}
                  isDraggable={reference.type !== 'project' && !isSaving}
                  onRemove={() => removeReference(reference)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <PopoverTrigger asChild>
            <Button
              type="button"
              variant={state.references.length > 0 ? 'ghost' : 'outline'}
              size={state.references.length > 0 ? 'icon' : 'sm'}
              className={cn(
                'shrink-0 bg-background text-xs',
                state.references.length > 0
                  ? 'size-8 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground'
                  : 'min-h-8 gap-1.5 rounded-md px-3'
              )}
              disabled={isSaving}
            >
              {state.references.length > 0 ? (
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
        </div>
        <PopoverContent
          align={state.references.length > 0 ? 'end' : 'start'}
          sideOffset={8}
          collisionPadding={12}
          className="max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[min(28rem,calc(100vw-1.5rem),var(--radix-popover-content-available-width))] overflow-hidden p-3"
        >
          <Tabs
            value={effectiveSelectedType}
            onValueChange={(value) => setSelectedType(value as EmailReferenceFilterType)}
          >
            <TabsList
              variant="line"
              size="sm"
              className="mb-3 w-full flex-nowrap justify-start gap-4 overflow-x-auto border-b"
              aria-label="Reference type"
            >
              <TabsTrigger
                value="all"
                disabled={isOtherSelected}
                className="min-h-10 px-1 uppercase tracking-normal"
              >
                All
              </TabsTrigger>
              {EMAIL_REFERENCE_TYPES.map((item) => (
                <TabsTrigger
                  key={item.type}
                  value={item.type}
                  disabled={isOtherSelected && item.type !== 'other'}
                  className="min-h-10 px-1"
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <ReferencePicker
            accountId={accountId}
            type={effectiveSelectedType}
            projectId={
              effectiveSelectedType === 'project' || effectiveSelectedType === 'all'
                ? selectedProjectId
                : (selectedProjectId ?? undefined)
            }
            placeholder={
              effectiveSelectedType === 'all'
                ? 'Search all references'
                : (EMAIL_REFERENCE_TYPES.find((item) => item.type === effectiveSelectedType)
                    ?.placeholder ?? 'Add reference')
            }
            selectedReferences={references}
            otherLocked={isOtherSelected}
            onAdd={addReference}
          />
        </PopoverContent>
      </Popover>
      {isOtherSelected && (
        <OtherTagPanel
          tags={tags}
          keywordSet={keywordSet}
          messageId={messageId}
          newTagName={newTagName}
          isUpdatingTags={isUpdatingTags}
          isCreatingTag={isCreatingTag}
          onNewTagNameChange={setNewTagName}
          onSubmitNewTag={submitNewTag}
          onToggleTag={onToggleTag}
          onCreateTag={onCreateTag}
        />
      )}
    </section>
  );
}

function ReferenceChip({
  reference,
  isSaving,
  isDraggable,
  onRemove,
}: {
  reference: EmailReference;
  isSaving?: boolean;
  isDraggable?: boolean;
  onRemove: () => void;
}) {
  const id = `${reference.type}:${reference.entityType ?? 'manual'}:${reference.entityId ?? reference.label}`;
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id,
    disabled: !isDraggable,
  });
  const style: CSSProperties = {
    transition,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 10 : undefined,
  };
  const typeLabel = getReferenceTypeLabel(reference.type);
  const showTypeSegment = reference.type !== 'other';

  return (
    <span
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDraggable ? listeners : undefined)}
      className={cn(
        'group inline-flex h-8 max-w-full min-w-0 items-center overflow-hidden rounded-md border border-border bg-background text-xs font-medium shadow-xs shadow-black/5',
        isDraggable
          ? 'cursor-grab touch-none hover:border-primary/50 hover:shadow-sm active:cursor-grabbing'
          : 'cursor-default',
        isDragging && 'opacity-80 shadow-md'
      )}
      title={`${typeLabel}: ${reference.label}`}
    >
      {showTypeSegment && (
        <>
          <span className="flex h-full shrink-0 items-center bg-muted/50 px-2 text-muted-foreground">
            {typeLabel}
          </span>
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
        </>
      )}
      <span className="min-w-0 max-w-56 truncate px-2.5 text-foreground">{reference.label}</span>
      <span className="flex h-full shrink-0 items-center border-l border-border bg-muted/20 px-1 opacity-75 transition-opacity group-hover:opacity-100">
        <BubbleIconButton
          label={`Remove ${reference.label}`}
          disabled={isSaving}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onRemove}
        >
          <X aria-hidden="true" className="size-3" />
        </BubbleIconButton>
      </span>
    </span>
  );
}

function OtherExclusivePickerNotice() {
  return (
    <div className="rounded-md border border-border bg-muted/25 p-3 text-sm">
      <p className="font-medium text-foreground">Other is exclusive</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Remove the Other chip before linking this mail to a project, PO, invoice, RFQ, RFI, or CO.
        Use tags below to organize uncategorized mail into provider tag folders.
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
                  'inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
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
  return (
    <div className="shrink-0">
      <div className="inline-flex rounded-full border border-border bg-muted/30 p-0.5">
        <ThreadStateButton
          active={state === 'open'}
          state="open"
          label="Open"
          icon={CircleDotDashed}
          disabled={isSaving}
          onClick={() => onChange('open')}
        />
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
        state === 'open'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-success-soft text-success-soft-foreground'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          state === 'open' ? 'bg-destructive' : 'bg-success-accent'
        )}
      />
      {state === 'open' ? 'Open' : 'Closed'}
    </span>
  );
}

function ReferencePicker({
  accountId,
  type,
  projectId,
  placeholder,
  selectedReferences,
  otherLocked,
  onAdd,
}: {
  accountId: string;
  type: EmailReferenceFilterType;
  projectId?: string;
  placeholder: string;
  selectedReferences: EmailReference[];
  otherLocked: boolean;
  onAdd: (reference: EmailReference) => void;
}) {
  if (otherLocked && type !== 'other') {
    return <OtherExclusivePickerNotice />;
  }

  if (type === 'all') {
    return (
      <AllReferencePicker
        accountId={accountId}
        projectId={projectId}
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
          'flex min-h-10 w-full items-center justify-between rounded-sm px-2 text-left text-sm hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
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
      projectId={projectId}
      placeholder={placeholder}
      selectedReferences={selectedReferences}
      onAdd={onAdd}
    />
  );
}

function AllReferencePicker({
  accountId,
  projectId,
  placeholder,
  selectedReferences,
  onAdd,
}: {
  accountId: string;
  projectId?: string;
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
      projectId,
      debouncedSearch,
    ],
    queryFn: async () => {
      const groups = await Promise.all(
        SEARCHABLE_REFERENCE_TYPES.map(async (type) => {
          const options = await emailApi.listReferenceOptions({
            accountId,
            type,
            projectId: type === 'project' ? undefined : projectId,
            search: debouncedSearch || undefined,
            size: 8,
          });
          return options.map((option) => ({
            ...option,
            groupLabel: getReferenceTypeLabel(type),
          }));
        })
      );

      return groups.flat();
    },
    staleTime: 60 * 1000,
    enabled: Boolean(accountId),
  });
  const options = optionsQuery.data ?? [];

  return (
    <Command shouldFilter={false}>
      <CommandInput value={search} placeholder={placeholder} onValueChange={setSearch} />
      <CommandList className="max-h-80">
        {optionsQuery.isLoading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            Loading
          </div>
        ) : (
          <CommandEmpty>No matches found.</CommandEmpty>
        )}
        {options.map((option) => {
          const selected = isOptionSelected(option, selectedReferences);
          return (
            <CommandItem
              key={`${option.entityType}:${option.entityId}`}
              value={`${option.groupLabel} ${option.label} ${option.meta ?? ''}`}
              className={cn(
                'min-h-10',
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
  projectId,
  placeholder,
  selectedReferences,
  onAdd,
}: {
  accountId: string;
  type: Exclude<EmailReferenceType, 'rfi' | 'other'>;
  projectId?: string;
  placeholder: string;
  selectedReferences: EmailReference[];
  onAdd: (reference: EmailReference) => void;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 200);
  const optionsQuery = useQuery({
    queryKey: ['connected-email', 'reference-options', accountId, type, projectId, debouncedSearch],
    queryFn: () =>
      emailApi.listReferenceOptions({
        accountId,
        type,
        projectId,
        search: debouncedSearch || undefined,
      }),
    staleTime: 60 * 1000,
    enabled: Boolean(accountId),
  });
  const options = optionsQuery.data ?? [];
  const createLabel = search.replace(/\s+/g, ' ').trim();
  const hasExactMatch = options.some(
    (option) => option.label.toLowerCase() === createLabel.toLowerCase()
  );
  const canCreateReference = createLabel.length > 0 && !hasExactMatch && !optionsQuery.isLoading;

  return (
    <Command shouldFilter={false}>
      <CommandInput value={search} placeholder={placeholder} onValueChange={setSearch} />
      <CommandList className="max-h-64">
        {optionsQuery.isLoading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            Loading
          </div>
        ) : (
          <CommandEmpty>No matches found.</CommandEmpty>
        )}
        {options.map((option) => {
          const selected = isOptionSelected(option, selectedReferences);
          return (
            <CommandItem
              key={`${option.entityType}:${option.entityId}`}
              value={`${option.label} ${option.meta ?? ''}`}
              className={cn(
                'min-h-10',
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
            className="min-h-10 border-t border-border"
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
        'inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        active &&
          (state === 'open'
            ? 'bg-destructive/10 text-destructive shadow-xs'
            : 'bg-success-soft text-success-soft-foreground shadow-xs')
      )}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </button>
  );
}

function BubbleIconButton({
  label,
  disabled,
  children,
  onPointerDown,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-25"
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

function isOptionSelected(option: EmailReferenceOption, selectedReferences: EmailReference[]) {
  return selectedReferences.some((reference) => {
    if (reference.type !== option.type) return false;
    if (reference.entityId || option.entityId) {
      return reference.entityId === option.entityId && reference.entityType === option.entityType;
    }

    return reference.label.toLowerCase() === option.label.toLowerCase();
  });
}

function getReferenceTypeLabel(type: EmailReferenceType) {
  return EMAIL_REFERENCE_TYPES.find((item) => item.type === type)?.label ?? 'Ref';
}

function isEditableKeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
