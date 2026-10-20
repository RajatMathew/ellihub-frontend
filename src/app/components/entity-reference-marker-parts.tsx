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
  getReferenceKind,
  getReferenceTypeLabel,
  groupReferencesByType,
  manualReferenceType,
  orderOptionsBySelection,
  referencesMatch,
  type EntityReference,
  type EntityReferenceApi,
  type EntityReferenceCategory,
  type EntityReferenceKind,
  type EntityReferenceOption,
  type EntityReferenceType,
} from '@/app/components/entity-reference-marker-storage';
import {
  dedupeReferenceOptions,
  fetchAllReferenceOptions,
  fetchReferenceOptionsOfType,
} from '@/app/components/entity-reference-options-query';
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
import { Check, Info, Loader2, Plus, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * The option rows, gapped and able to animate between positions.
 *
 * Ticking an option moves it into the pinned block at the top of the list
 * (see `withSelectedOptionsPinned`). It used to teleport: the row you clicked
 * and the rows it displaced all changed place between two frames, so nothing
 * connected the row you touched to the one that ended up at the top
 * (elli-ui#1041).
 */
const OPTION_LIST_CLASSNAME =
  'max-h-none min-h-0 flex-1 [&_[cmdk-list-sizer]]:flex [&_[cmdk-list-sizer]]:flex-col [&_[cmdk-list-sizer]]:gap-1';

/**
 * Pill-shaped, filled search field (cream, no border) rather than the default
 * underlined `CommandInput` — targets cmdk's own wrapper attribute since the
 * primitive doesn't expose that div's className.
 */
const SEARCH_INPUT_WRAPPER_CLASSNAME =
  '[&_[cmdk-input-wrapper]]:mt-1.5 [&_[cmdk-input-wrapper]]:mb-2 [&_[cmdk-input-wrapper]]:rounded-md [&_[cmdk-input-wrapper]]:border [&_[cmdk-input-wrapper]]:border-border [&_[cmdk-input-wrapper]]:px-3.5 [&_[cmdk-input-wrapper]]:transition-colors [&_[cmdk-input-wrapper]]:has-[:focus]:border-primary';

const MotionCommandItem = motion.create(CommandItem);

function ReferenceOptionItem(props: React.ComponentProps<typeof MotionCommandItem>) {
  // `position` and not `true`: the rows are different heights (a second line
  // of meta on some, not others) and animating size as well makes the list
  // breathe on every click rather than just resettle.
  const reduceMotion = useReducedMotion();

  return (
    <MotionCommandItem
      layout={reduceMotion ? false : 'position'}
      transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.6 }}
      {...props}
    />
  );
}

/** Filled checkmark for a selected row, empty outline square otherwise — matches the checkbox
 * list treatment used across the app rather than a bare check glyph. */
function ReferenceOptionCheckbox({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
      )}
    >
      {selected && <Check className="size-3.5" strokeWidth={2.75} />}
    </span>
  );
}

export type EntityReferenceFilterType = 'all' | EntityReferenceKind;

/** Reserve for the "+N more" toggle so it never has to squeeze in after the fact. */
const OVERFLOW_TOGGLE_RESERVED_WIDTH = 72;
const CHIP_GAP = 6;

/**
 * One reference-type tab. Matches `CategorySegmentedControl` below — same fill,
 * same weights — so the picker and the switch that opens it read as one control
 * rather than two (elli-ui#984, #988).
 */
const REFERENCE_TAB_CLASS =
  'h-6 rounded-md px-2.5 text-xs font-medium text-mail-mid hover:bg-mail-chip/60 hover:text-mail-ink data-[state=active]:bg-mail-chip data-[state=active]:font-semibold data-[state=active]:text-mail-ink';

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
  type: EntityReferenceKind;
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
  side = 'bottom',
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
  side?: 'top' | 'right' | 'bottom' | 'left';
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
      side={side}
      avoidCollisions={false}
      sideOffset={8}
      collisionPadding={12}
      className="flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-[min(28rem,calc(100vw-1.5rem),var(--radix-popover-content-available-width))] flex-col overflow-hidden rounded-lg border-mail-hair p-0 shadow-md"
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
          className="w-full flex-nowrap justify-start gap-0.5 overflow-x-auto px-2 pt-2 pb-1.5"
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

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 pb-2">
        {projectRequired && selectedType === 'project' && (
          <div className="mx-1 mt-1 flex shrink-0 items-center gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm font-semibold text-warning-soft-foreground">
            <Info aria-hidden="true" className="size-3.5 shrink-0" />
            <span>Select at least one project first.</span>
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
    const isOtherSelected = selectedReferences.some((reference) => reference.type === 'other');
    return (
      <button
        type="button"
        className={cn(
          'flex min-h-10 w-full cursor-pointer items-center justify-between rounded-md px-2 text-left text-sm hover:bg-mail-chip focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          isOtherSelected && 'bg-mail-chip font-medium text-mail-ink'
        )}
        onClick={() => onAdd({ type: 'other', entityType: null, entityId: null, label: 'Other' })}
      >
        <span>Mark as Other</span>
        {isOtherSelected ? (
          <CommandCheck aria-hidden="true" className="text-brand-clay" />
        ) : (
          <Plus aria-hidden="true" className="size-4 text-muted-foreground" />
        )}
      </button>
    );
  }

  const category = categories.find((item) => item.type === type);
  const manualType = manualReferenceType(type);
  if (category?.manualEntry && manualType) {
    return <ManualReferencePicker type={manualType} placeholder={placeholder} onAdd={onAdd} />;
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
    // One request for every type and every linked project. The signal lets a
    // tick or a keystroke abort the request it replaced instead of leaving it
    // running on the server.
    queryFn: ({ signal }) =>
      fetchAllReferenceOptions(api, {
        scopeId,
        types: searchableTypes,
        projectIds,
        search: debouncedSearch,
        signal,
      }),
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
    <Command shouldFilter={false} className={cn('min-h-0 flex-1', SEARCH_INPUT_WRAPPER_CLASSNAME)}>
      <CommandInput
        value={search}
        placeholder={placeholder}
        onValueChange={setSearch}
        className="h-9 py-0"
      />
      <CommandList className={OPTION_LIST_CLASSNAME}>
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
            <ReferenceOptionItem
              key={`${option.type}:${option.entityType}:${option.entityId ?? option.label}`}
              value={`${option.groupLabel} ${option.label} ${option.meta ?? ''}`}
              className={cn(
                'min-h-9 cursor-pointer rounded-md px-2 data-[selected=true]:bg-mail-chip',
                selected && 'bg-mail-chip font-medium text-mail-ink'
              )}
              onSelect={() => onAdd(optionToReference(option))}
            >
              <ReferenceOptionCheckbox selected={selected} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{getOptionDisplayLabel(option)}</span>
                <span className="block truncate text-xs text-mail-mid">{option.groupLabel}</span>
              </span>
            </ReferenceOptionItem>
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
  type: Exclude<EntityReferenceKind, 'other'>;
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
    queryFn: ({ signal }) =>
      fetchReferenceOptionsOfType(api, {
        scopeId,
        type,
        projectIds,
        search: debouncedSearch,
        signal,
      }),
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
  const createType = manualReferenceType(type);
  const canCreateReference =
    createType !== null && createLabel.length > 0 && !hasExactMatch && !showLoading;

  return (
    <Command shouldFilter={false} className={cn('min-h-0 flex-1', SEARCH_INPUT_WRAPPER_CLASSNAME)}>
      <CommandInput
        value={search}
        placeholder={placeholder}
        onValueChange={setSearch}
        className="h-9 py-0"
      />
      <CommandList className={OPTION_LIST_CLASSNAME}>
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
            <ReferenceOptionItem
              key={`${option.type}:${option.entityType}:${option.entityId ?? option.label}`}
              value={`${option.label} ${option.meta ?? ''}`}
              className={cn(
                'min-h-10 cursor-pointer rounded-md px-2 data-[selected=true]:bg-mail-chip',
                selected && 'bg-mail-chip font-medium text-mail-ink'
              )}
              onSelect={() => onAdd(optionToReference(option))}
            >
              <ReferenceOptionCheckbox selected={selected} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{getOptionDisplayLabel(option)}</span>
                {option.meta && (
                  <span className="block truncate text-xs text-mail-mid">{option.meta}</span>
                )}
              </span>
            </ReferenceOptionItem>
          );
        })}
        {canCreateReference && createType && (
          <CommandItem
            value={`create ${createLabel}`}
            className="mt-1 min-h-9 cursor-pointer rounded-md border-t border-mail-hair px-2 pt-2 data-[selected=true]:bg-mail-chip"
            onSelect={() =>
              onAdd({
                type: createType,
                entityType: null,
                entityId: null,
                label: createLabel,
              })
            }
          >
            <Plus aria-hidden="true" className="mr-2 size-3.5 text-mail-mid" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">Create {getReferenceTypeLabel(type)} reference</span>
              <span className="block truncate text-xs text-mail-mid">{createLabel}</span>
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

/**
 * PO/CO/RFQ/RFI/invoice labels arrive from the server as `"PO-25321 - Please
 * advise minimum 1 day before delivery..."` — the record's number followed by
 * its free-text description. Only the number belongs in a picker row; strip
 * everything after the first " - " for the non-project types.
 */
function getOptionDisplayLabel(option: EntityReferenceOption): string {
  if (option.type === 'project' || option.type === 'other') return option.label;
  const separatorIndex = option.label.indexOf(' - ');
  return separatorIndex === -1 ? option.label : option.label.slice(0, separatorIndex);
}

function optionToReference(option: EntityReferenceOption): EntityReference {
  return {
    type: option.type,
    entityType: option.entityType,
    entityId: option.entityId,
    label: getOptionDisplayLabel(option),
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
  eligibleTypes: readonly EntityReferenceKind[],
  search: string,
  getGroupLabel: (type: EntityReferenceKind) => string
): T[] {
  const normalizedSearch = search.trim().toLowerCase();
  const missingSelected = selectedReferences
    .filter((reference) => eligibleTypes.includes(getReferenceKind(reference)))
    .filter((reference) => !fetchedOptions.some((option) => referencesMatch(reference, option)))
    .filter(
      (reference) => !normalizedSearch || reference.label.toLowerCase().includes(normalizedSearch)
    )
    .map((reference) => referenceToOption(reference, getGroupLabel(getReferenceKind(reference))));

  const merged = dedupeReferenceOptions([...missingSelected, ...fetchedOptions] as T[]);
  return orderOptionsBySelection(merged, selectedReferences);
}

function isOptionSelected(option: EntityReferenceOption, selectedReferences: EntityReference[]) {
  return selectedReferences.some((reference) => referencesMatch(reference, option));
}
