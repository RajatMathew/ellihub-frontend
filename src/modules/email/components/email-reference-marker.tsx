import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Input } from '@/app/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import { emailApi } from '@/modules/email/api';
import {
  EMAIL_REFERENCE_TYPES,
  type EmailReference,
  type EmailReferenceMarkerState,
  type EmailReferenceOption,
  type EmailReferenceType,
  type EmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import { useQuery } from '@tanstack/react-query';
import {
  AtSign,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDotDashed,
  Loader2,
  Plus,
  X,
} from 'lucide-react';

type EmailReferenceMarkerProps = {
  accountId: string;
  state: EmailReferenceMarkerState;
  isSaving?: boolean;
  onChange: (state: EmailReferenceMarkerState) => void;
};

type EmailThreadStatusMarkerProps = {
  state: EmailThreadState;
  isSaving?: boolean;
  onChange: (state: EmailThreadState) => void;
};

export function EmailReferenceMarker({
  accountId,
  state,
  isSaving,
  onChange,
}: EmailReferenceMarkerProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EmailReferenceType>('project');
  const selectedProjectId = useMemo(
    () => state.references.find((reference) => reference.type === 'project')?.entityId ?? undefined,
    [state.references]
  );

  const updateReferences = (references: EmailReference[]) => {
    onChange({
      ...state,
      references: references.map((reference, index) => ({ ...reference, sortOrder: index })),
    });
  };

  const removeReference = (index: number) => {
    updateReferences(state.references.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveReference = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= state.references.length) return;
    const next = [...state.references];
    const item = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = item;
    updateReferences(next);
  };

  const addReference = (reference: EmailReference) => {
    const exists = state.references.some(
      (item) =>
        item.type === reference.type &&
        (item.entityId || item.label.toLowerCase()) ===
          (reference.entityId || reference.label.toLowerCase())
    );
    if (exists) return;

    updateReferences([...state.references, reference]);
    setOpen(false);
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
    <section className="mt-2 min-w-0" aria-label="References">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-8 gap-1.5 rounded-full bg-background px-3 text-xs"
            disabled={isSaving}
          >
            <AtSign aria-hidden="true" className="size-3.5 text-primary" />
            References
            {state.references.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] text-muted-foreground">
                {state.references.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-2">
          <div className="flex flex-wrap gap-1 pb-2">
            {EMAIL_REFERENCE_TYPES.map((item) => (
              <button
                key={item.type}
                type="button"
                className={cn(
                  'inline-flex min-h-8 shrink-0 items-center rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  selectedType === item.type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 hover:text-foreground'
                )}
                aria-pressed={selectedType === item.type}
                onClick={() => setSelectedType(item.type)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <ReferencePicker
            accountId={accountId}
            type={selectedType}
            projectId={selectedType === 'project' ? undefined : (selectedProjectId ?? undefined)}
            placeholder={
              EMAIL_REFERENCE_TYPES.find((item) => item.type === selectedType)?.placeholder ??
              'Add reference'
            }
            onAdd={addReference}
          />
        </PopoverContent>
      </Popover>

      {state.references.length > 0 && (
        <div className="mt-2 flex max-w-md flex-col items-start gap-1.5">
          {state.references.map((reference, index) => (
            <span
              key={`${reference.type}:${reference.entityType ?? 'manual'}:${reference.entityId ?? reference.label}`}
              className="group flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/35 px-2.5 text-xs font-medium text-foreground"
              title={`${getReferenceTypeLabel(reference.type)}: ${reference.label}`}
            >
              {reference.type !== 'other' && (
                <span className="shrink-0 text-[0.625rem] uppercase text-muted-foreground">
                  {getReferenceTypeLabel(reference.type)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{reference.label}</span>
              <span className="flex shrink-0 items-center gap-0.5 opacity-70 group-hover:opacity-100">
                <BubbleIconButton
                  label={`Move ${reference.label} up`}
                  disabled={index === 0 || isSaving}
                  onClick={() => moveReference(index, -1)}
                >
                  <ChevronUp aria-hidden="true" className="size-3" />
                </BubbleIconButton>
                <BubbleIconButton
                  label={`Move ${reference.label} down`}
                  disabled={index === state.references.length - 1 || isSaving}
                  onClick={() => moveReference(index, 1)}
                >
                  <ChevronDown aria-hidden="true" className="size-3" />
                </BubbleIconButton>
                <BubbleIconButton
                  label={`Remove ${reference.label}`}
                  disabled={isSaving}
                  onClick={() => removeReference(index)}
                >
                  <X aria-hidden="true" className="size-3" />
                </BubbleIconButton>
              </span>
            </span>
          ))}
        </div>
      )}
    </section>
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
  onAdd,
}: {
  accountId: string;
  type: EmailReferenceType;
  projectId?: string;
  placeholder: string;
  onAdd: (reference: EmailReference) => void;
}) {
  if (type === 'other') {
    return (
      <button
        type="button"
        className="flex min-h-10 w-full items-center justify-between rounded-sm px-2 text-left text-sm hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onAdd({ type: 'other', entityType: null, entityId: null, label: 'Other' })}
      >
        <span>Mark as Other</span>
        <Plus aria-hidden="true" className="size-4 text-muted-foreground" />
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
      onAdd={onAdd}
    />
  );
}

function SearchReferencePicker({
  accountId,
  type,
  projectId,
  placeholder,
  onAdd,
}: {
  accountId: string;
  type: Exclude<EmailReferenceType, 'rfi' | 'other'>;
  projectId?: string;
  placeholder: string;
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
        {options.map((option) => (
          <CommandItem
            key={`${option.entityType}:${option.entityId}`}
            value={`${option.label} ${option.meta ?? ''}`}
            className="min-h-10"
            onSelect={() => onAdd(optionToReference(option))}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{option.label}</span>
              {option.meta && (
                <span className="block truncate text-xs text-muted-foreground">{option.meta}</span>
              )}
            </span>
          </CommandItem>
        ))}
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
  onClick,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-25"
      aria-label={label}
      disabled={disabled}
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

function getReferenceTypeLabel(type: EmailReferenceType) {
  return EMAIL_REFERENCE_TYPES.find((item) => item.type === type)?.label ?? 'Ref';
}

function isEditableKeyTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
