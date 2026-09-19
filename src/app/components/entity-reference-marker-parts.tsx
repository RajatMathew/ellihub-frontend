/**
 * Presentational pieces for the entity reference marker, split out of
 * `entity-reference-marker.tsx` so that file's `useEntityReferenceMarker`
 * hook export doesn't share a module with component declarations — Vite's
 * fast-refresh boundary (`react-refresh/only-export-components`) requires a
 * file to export either only components or only non-components, not both.
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  getReferenceGroupLabel,
  getReferenceIdentity,
  getReferenceTypeLabel,
  groupReferencesByType,
  type EntityReference,
  type EntityReferenceApi,
  type EntityReferenceCategory,
  type EntityReferenceOption,
  type EntityReferenceType,
} from '@/app/components/entity-reference-marker-storage';
import { dedupeReferenceOptions } from '@/app/components/entity-reference-options-query';
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
import { PopoverContent } from '@/app/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Info, Loader2, Plus, X } from 'lucide-react';

export type EntityReferenceFilterType = 'all' | EntityReferenceType;

/** Reserve for the "+N more" toggle so it never has to squeeze in after the fact. */
const OVERFLOW_TOGGLE_RESERVED_WIDTH = 72;
const CHIP_GAP = 6;

/**
 * One reference-type tab. Matches `CategorySegmentedControl` below — same fill,
 * same weights — so the picker and the switch that opens it read as one control
 * rather than two (elli-ui#984, #988).
 */
const REFERENCE_TAB_CLASS =
  'h-7 rounded-md px-3 text-[13px] font-medium text-mail-mid hover:bg-mail-chip/60 hover:text-mail-ink data-[state=active]:bg-mail-chip data-[state=active]:font-semibold data-[state=active]:text-mail-ink';

export function CategorySegmentedControl({
  value,
  disabled,
  onChange,
}: {
  value: 'project' | 'other';
  disabled?: boolean;
  onChange: (value: 'project' | 'other') => void;
}) {
  return (
    // No track behind the pair. A filled grey rail around two words was the
    // heaviest object in a 288px details panel and read as a form control
    // rather than a choice already made — the selected side alone carries the
    // fill now, and the other is plain text (elli-ui#984).
    <div className="inline-flex h-8 shrink-0 items-center gap-1">
      {(['project', 'other'] as const).map((item) => (
        <button
          key={item}
          type="button"
          className={cn(
            'inline-flex h-7 cursor-pointer items-center justify-center rounded-md px-3 text-[13px] capitalize transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
            value === item
              ? 'bg-mail-chip font-semibold text-mail-ink'
              : 'font-medium text-mail-mid hover:bg-mail-chip/60 hover:text-mail-ink'
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

export function ReferenceGroups({
  references,
  isSaving,
  onRemove,
}: {
  references: EntityReference[];
  isSaving?: boolean;
  onRemove: (reference: EntityReference) => void;
}) {
  const groups = useMemo(() => groupReferencesByType(references), [references]);

  return (
    <div className="divide-y divide-border/50">
      {groups.map((group) => (
        <ReferenceGroupRow
          key={group.type}
          type={group.type}
          references={group.references}
          isSaving={isSaving}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function ReferenceGroupRow({
  type,
  references,
  isSaving,
  onRemove,
}: {
  type: EntityReferenceType;
  references: EntityReference[];
  isSaving?: boolean;
  onRemove: (reference: EntityReference) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(references.length);
  const typeLabel = getReferenceGroupLabel(type);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Fitting chips by a fixed count clips whichever one lands on the edge —
  // a long label just gets cut off mid-word. Measure each chip's actual
  // rendered width instead, so only chips that fully fit ever show; anything
  // else collapses into "+N more" up front.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (expanded || !container || !measure) return;

    const recompute = () => {
      const available = container.clientWidth;
      const chipEls = Array.from(measure.children) as HTMLElement[];
      let used = 0;
      let count = 0;

      for (const chipEl of chipEls) {
        const width = chipEl.offsetWidth;
        const isLast = count === chipEls.length - 1;
        const reserve = isLast ? 0 : OVERFLOW_TOGGLE_RESERVED_WIDTH;
        const nextUsed = used + width + (count > 0 ? CHIP_GAP : 0);
        if (count > 0 && nextUsed + reserve > available) break;
        used = nextUsed;
        count += 1;
      }

      setVisibleCount(Math.max(count, 1));
    };

    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    return () => observer.disconnect();
  }, [expanded, references]);

  const visible = expanded ? references : references.slice(0, visibleCount);
  // Collapsed fit count is left untouched while expanded (the effect above
  // skips recomputing it), so this stays true even once every chip is shown —
  // otherwise the toggle disappears the moment you expand it, with no way
  // to collapse back.
  const hasOverflow = references.length > visibleCount;

  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-1.5">
      <span className="w-16 shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {typeLabel}
      </span>
      <div
        ref={containerRef}
        className={cn(
          'relative flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden',
          expanded && 'flex-wrap'
        )}
      >
        {visible.map((reference) => (
          <ReferenceChip
            key={getReferenceIdentity(reference)}
            reference={reference}
            isProject={type === 'project'}
            isSaving={isSaving}
            onRemove={onRemove}
          />
        ))}
        {!expanded && (
          <div
            ref={measureRef}
            aria-hidden="true"
            className="invisible absolute left-0 top-0 flex items-center gap-1.5"
          >
            {references.map((reference) => (
              <ReferenceChip
                key={`measure-${getReferenceIdentity(reference)}`}
                reference={reference}
                isProject={type === 'project'}
                onRemove={() => undefined}
              />
            ))}
          </div>
        )}
      </div>
      {hasOverflow && (
        <button
          type="button"
          className="ml-auto shrink-0 cursor-pointer text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Hide' : `+${references.length - visibleCount} more`}
        </button>
      )}
    </div>
  );
}

function ReferenceChip({
  reference,
  isProject,
  isSaving,
  onRemove,
}: {
  reference: EntityReference;
  isProject: boolean;
  isSaving?: boolean;
  onRemove: (reference: EntityReference) => void;
}) {
  return (
    <span className="group/reference inline-flex h-7 max-w-full shrink-0 items-center gap-1 rounded-md border border-border bg-muted/40 pl-2 pr-1 text-xs font-medium text-foreground">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('max-w-64 truncate', isProject && 'font-semibold text-brand-clay')}>
            {reference.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" showArrow className="max-w-80 whitespace-normal break-words">
          {reference.label}
        </TooltipContent>
      </Tooltip>
      <button
        type="button"
        aria-label={`Remove ${reference.label}`}
        disabled={isSaving}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onRemove(reference)}
        className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </span>
  );
}

function OtherExclusivePickerNotice() {
  return (
    <div className="rounded-md border border-border bg-muted/25 p-3 text-sm">
      <p className="font-medium text-foreground">Other is exclusive</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Switch back to Project before adding a project, PO, invoice, RFQ, RFI, or CO reference.
      </p>
    </div>
  );
}

function ProjectRequiredNotice() {
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
      <p className="font-medium text-foreground">Add a project first</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Link this to a project before adding an RFQ, purchase order, invoice, or change order.
      </p>
    </div>
  );
}

export function ReferencePickerPopover({
  scopeId,
  api,
  categories,
  align,
  selectedType,
  selectedProjectIds,
  selectedReferences,
  otherLocked,
  projectRequired,
  onSelectedTypeChange,
  onAdd,
}: {
  scopeId: string;
  api: EntityReferenceApi;
  categories: EntityReferenceCategory[];
  align: 'start' | 'end';
  selectedType: EntityReferenceFilterType;
  selectedProjectIds: string[];
  selectedReferences: EntityReference[];
  otherLocked: boolean;
  projectRequired: boolean;
  onSelectedTypeChange: (value: EntityReferenceFilterType) => void;
  onAdd: (reference: EntityReference) => void;
}) {
  return (
    <PopoverContent
      align={align}
      side="bottom"
      avoidCollisions={false}
      sideOffset={8}
      collisionPadding={12}
      className="flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[min(28rem,calc(100vw-1.5rem),var(--radix-popover-content-available-width))] flex-col overflow-hidden rounded-lg p-0"
    >
      <Tabs
        value={selectedType}
        onValueChange={(value) => onSelectedTypeChange(value as EntityReferenceFilterType)}
        className="shrink-0"
      >
        {/*
          Pills rather than underlines (elli-ui#988), and the same pills the
          Project | Other switch above the panel uses — the two sit within a few
          hundred pixels of each other and were drawn in two different
          languages. The list keeps its rule underneath to hold the popover's
          header apart from the results; the tabs themselves carry no track.
        */}
        <TabsList
          variant="button"
          size="sm"
          className="w-full flex-nowrap justify-start gap-1 overflow-x-auto border-b border-mail-hair px-2 py-1.5"
          aria-label="Reference type"
        >
          <TabsTrigger
            value="all"
            disabled={otherLocked || projectRequired}
            className={REFERENCE_TAB_CLASS}
          >
            All
          </TabsTrigger>
          {categories.map((item) => (
            <TabsTrigger
              key={item.type}
              value={item.type}
              disabled={otherLocked || (projectRequired && item.type !== 'project')}
              className={REFERENCE_TAB_CLASS}
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        {projectRequired && selectedType === 'project' && (
          <div className="flex shrink-0 items-center gap-2 rounded-md border border-info/15 bg-info-soft/50 px-3 py-2 text-xs text-info-soft-foreground">
            <Info aria-hidden="true" className="size-3.5 shrink-0" />
            <span>You need to select project first.</span>
          </div>
        )}
        <ReferencePicker
          scopeId={scopeId}
          api={api}
          categories={categories}
          type={selectedType}
          projectIds={selectedProjectIds}
          placeholder={
            selectedType === 'all'
              ? 'Search all references'
              : (categories.find((item) => item.type === selectedType)?.placeholder ??
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

function ReferencePicker({
  scopeId,
  api,
  categories,
  type,
  projectIds,
  placeholder,
  selectedReferences,
  otherLocked,
  projectRequired,
  onAdd,
}: {
  scopeId: string;
  api: EntityReferenceApi;
  categories: EntityReferenceCategory[];
  type: EntityReferenceFilterType;
  projectIds: string[];
  placeholder: string;
  selectedReferences: EntityReference[];
  otherLocked: boolean;
  projectRequired: boolean;
  onAdd: (reference: EntityReference) => void;
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
        scopeId={scopeId}
        api={api}
        categories={categories}
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

  const category = categories.find((item) => item.type === type);
  if (category?.manualEntry) {
    return <ManualReferencePicker type={type} placeholder={placeholder} onAdd={onAdd} />;
  }

  return (
    <SearchReferencePicker
      scopeId={scopeId}
      api={api}
      type={type}
      projectIds={projectIds}
      placeholder={placeholder}
      selectedReferences={selectedReferences}
      onAdd={onAdd}
    />
  );
}

function AllReferencePicker({
  scopeId,
  api,
  categories,
  projectIds,
  placeholder,
  selectedReferences,
  onAdd,
}: {
  scopeId: string;
  api: EntityReferenceApi;
  categories: EntityReferenceCategory[];
  projectIds: string[];
  placeholder: string;
  selectedReferences: EntityReference[];
  onAdd: (reference: EntityReference) => void;
}) {
  const searchableTypes = useMemo(
    () => categories.filter((item) => !item.manualEntry).map((item) => item.type),
    [categories]
  );
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 200);
  const optionsQuery = useQuery({
    queryKey: [
      'entity-reference-options',
      scopeId,
      'all',
      searchableTypes,
      projectIds,
      debouncedSearch,
    ],
    queryFn: async () => {
      const optionGroups = await Promise.all(
        searchableTypes.flatMap((type) =>
          (type === 'project' ? [undefined] : projectIds).map(async (projectId) => {
            const options = await api.listOptions({
              scopeId,
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
    enabled: Boolean(scopeId) && projectIds.length > 0,
  });
  const options = useMemo(
    () =>
      withSelectedOptionsPinned(
        optionsQuery.data ?? [],
        selectedReferences,
        searchableTypes,
        debouncedSearch,
        getReferenceTypeLabel
      ),
    [optionsQuery.data, selectedReferences, searchableTypes, debouncedSearch]
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
  scopeId,
  api,
  type,
  projectIds,
  placeholder,
  selectedReferences,
  onAdd,
}: {
  scopeId: string;
  api: EntityReferenceApi;
  type: Exclude<EntityReferenceType, 'other'>;
  projectIds: string[];
  placeholder: string;
  selectedReferences: EntityReference[];
  onAdd: (reference: EntityReference) => void;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 200);
  const optionsQuery = useQuery({
    queryKey: [
      'entity-reference-options',
      scopeId,
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
          api.listOptions({
            scopeId,
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
    enabled: Boolean(scopeId) && (type === 'project' || projectIds.length > 0),
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
  type: EntityReferenceType;
  placeholder: string;
  onAdd: (reference: EntityReference) => void;
}) {
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
      <label className="text-xs font-medium text-muted-foreground">Add {typeLabel}</label>
      <div className="flex gap-2">
        <Input
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

function optionToReference(option: EntityReferenceOption): EntityReference {
  return {
    type: option.type,
    entityType: option.entityType,
    entityId: option.entityId,
    label: option.label,
  };
}

function referenceToOption(
  reference: EntityReference,
  groupLabel: string
): EntityReferenceOption & { groupLabel: string } {
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
function withSelectedOptionsPinned<T extends EntityReferenceOption>(
  fetchedOptions: T[],
  selectedReferences: EntityReference[],
  eligibleTypes: readonly EntityReferenceType[],
  search: string,
  getGroupLabel: (type: EntityReferenceType) => string
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

type ReferenceLike = Pick<EntityReference, 'type' | 'entityType' | 'entityId' | 'label'>;

function referencesMatch(a: ReferenceLike, b: ReferenceLike) {
  if (a.type !== b.type) return false;
  if (a.entityId || b.entityId) {
    return a.entityId === b.entityId && (a.entityType ?? null) === (b.entityType ?? null);
  }

  return a.label.toLowerCase() === b.label.toLowerCase();
}

function isOptionSelected(option: EntityReferenceOption, selectedReferences: EntityReference[]) {
  return selectedReferences.some((reference) => referencesMatch(reference, option));
}
