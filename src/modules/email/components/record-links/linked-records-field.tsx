import { useMemo, useState } from 'react';

import {
  AddButton,
  FieldPopover,
  PickerEmpty,
  PickerOption,
  PickerSearch,
} from '@/app/components/record-modal';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import { pickerRowsFor, pickerSearchState } from '@/modules/email/lib/picker-search';
import {
  RECORD_TABS,
  RECORD_TAG,
  recordKey,
  recordRowParts,
  splitRecordLabel,
  type LinkedRecord,
  type RecordSearchType,
  type RecordTab,
} from '@/modules/email/lib/record-links';
import { Loader2, Plus, X } from 'lucide-react';

/** Where the picker finds records: the task board's search or a mailbox's. */
export type RecordOptionsSource = (
  search: string,
  types: readonly RecordSearchType[]
) => {
  data?: LinkedRecord[];
  isLoading: boolean;
  isError: boolean;
  /** A request is running — with the previous term's rows still in `data`. */
  isFetching?: boolean;
  isPlaceholderData?: boolean;
};

/**
 * "Linked items" in the task and event modals (elli-ui#1379): the projects,
 * RFQs, POs, change orders and invoices a task or event is about, and a
 * tabbed search to link more.
 */
export function LinkedRecordsField({
  value,
  onChange,
  useOptions,
  bringing = false,
}: {
  value: LinkedRecord[];
  onChange: (next: LinkedRecord[]) => void;
  useOptions: RecordOptionsSource;
  /** While a just-linked email's own items are being looked up. */
  bringing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      {value.length > 0 ? (
        <div
          // One grid for the whole list, each row a subgrid of it (elli-ui#1448):
          // the code column is exactly as wide as the longest code here, so
          // names line up without a fixed gutter of empty space before them.
          className="-mr-1.5 grid max-h-52 grid-cols-[auto_auto_minmax(0,1fr)_1.75rem] content-start gap-y-1.5 overflow-y-auto overscroll-contain pr-1.5"
        >
          {value.map((record) => (
            <RecordRow
              key={recordKey(record)}
              record={record}
              onRemove={() =>
                onChange(value.filter((item) => recordKey(item) !== recordKey(record)))
              }
            />
          ))}
        </div>
      ) : null}
      {bringing ? (
        <p
          role="status"
          className="flex h-7 items-center gap-2 px-2.5 text-[12.5px] text-muted-foreground"
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Bringing in the email’s linked items…
        </p>
      ) : null}
      <FieldPopover
        open={open}
        onOpenChange={setOpen}
        label="Link an item"
        side="top"
        className="w-[min(27rem,calc(100vw-3rem))]"
        trigger={
          <AddButton aria-haspopup="dialog">
            <Plus className="size-3.5" aria-hidden="true" />
            Link project, RFQ, PO…
          </AddButton>
        }
      >
        <RecordPickerList
          linked={value}
          useOptions={useOptions}
          onPick={(record) => {
            onChange([...value, record]);
            setOpen(false);
          }}
        />
      </FieldPopover>
    </div>
  );
}

export function RecordTag({ type }: { type: LinkedRecord['entityType'] }) {
  const tag = RECORD_TAG[type];
  return (
    <span
      className={cn(
        'block w-17 shrink-0 whitespace-nowrap rounded-md px-1.5 text-center text-xs font-medium leading-6',
        tag.className
      )}
    >
      {tag.label}
    </span>
  );
}

function RecordRow({ record, onRemove }: { record: LinkedRecord; onRemove: () => void }) {
  const { code, name } = recordRowParts(record);
  // One line per record, the way the picker lists them: the record's project
  // reads in the tooltip rather than as a second line under the name.
  const title = [record.label, record.meta].filter(Boolean).join(' · ') || undefined;
  return (
    <div
      title={title}
      className="group col-span-4 grid min-h-10 grid-cols-subgrid items-center gap-x-3 rounded-lg border border-border/70 bg-popover py-1.5 pl-2 pr-1.5 transition-colors hover:border-border"
    >
      <RecordTag type={record.entityType} />
      <span className="max-w-36 truncate font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[12.5px] tabular-nums text-muted-foreground">
        {code ?? ''}
      </span>
      <span
        className={cn(
          'truncate text-sm',
          record.label ? 'text-foreground' : 'italic text-muted-foreground'
        )}
      >
        {name}
      </span>
      <button
        type="button"
        aria-label={`Unlink ${record.label ?? 'record'}`}
        onClick={onRemove}
        className="grid size-6.5 cursor-pointer place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function RecordPickerList({
  linked,
  useOptions,
  onPick,
}: {
  linked: LinkedRecord[];
  useOptions: RecordOptionsSource;
  onPick: (record: LinkedRecord) => void;
}) {
  const [term, setTerm] = useState('');
  const [tab, setTab] = useState<RecordTab>('all');
  const debounced = useDebouncedValue(term, 250);
  const types = RECORD_TABS.find((item) => item.id === tab)?.types ?? RECORD_TABS[0].types;
  const query = useOptions(debounced.trim(), types);
  const taken = useMemo(() => new Set(linked.map(recordKey)), [linked]);
  // The rows on screen answer the previous term or tab until the new answer
  // arrives: narrowed to what matches meanwhile, and said to be a search.
  const state = pickerSearchState({
    term,
    settledTerm: debounced,
    isPlaceholderData: query.isPlaceholderData ?? false,
    isFetching: query.isFetching ?? false,
  });
  const rows = pickerRowsFor({
    rows: query.data ?? [],
    state,
    term,
    fieldsOf: (record) => [record.label, record.meta],
  }).filter((record) => !taken.has(recordKey(record)));
  return (
    <>
      <PickerSearch
        value={term}
        onChange={setTerm}
        placeholder="Search by name or number…"
        label="Search items"
      />
      <div className="flex flex-wrap gap-0.5 px-0.5 pb-1.5" role="tablist" aria-label="Item type">
        {RECORD_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'cursor-pointer disabled:cursor-not-allowed h-6.5 rounded-md px-2 text-[12.5px] transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              tab === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {item.label}
          </button>
        ))}
        {state === 'searching' && rows.length > 0 ? (
          <span role="status" className="ms-auto flex items-center px-1.5 text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-label="Searching items" />
          </span>
        ) : null}
      </div>
      <div className="max-h-64 overflow-y-auto" role="listbox" aria-label="Items">
        {query.isLoading ? (
          <PickerEmpty>
            <Loader2 className="mx-auto size-4 animate-spin" aria-label="Loading items" />
          </PickerEmpty>
        ) : query.isError ? (
          <PickerEmpty>Couldn’t load items. Try again.</PickerEmpty>
        ) : rows.length === 0 ? (
          <PickerEmpty>
            {state === 'searching' ? (
              <Loader2 className="mx-auto size-4 animate-spin" aria-label="Searching items" />
            ) : term.trim() ? (
              `Nothing matches “${term.trim()}”`
            ) : (
              'Nothing else to link here'
            )}
          </PickerEmpty>
        ) : (
          rows.map((record) => {
            const { code, name } = splitRecordLabel(record.label);
            return (
              <PickerOption key={recordKey(record)} onClick={() => onPick(record)}>
                <RecordTag type={record.entityType} />
                <span className="w-20 shrink-0 truncate font-mono text-xs text-muted-foreground">
                  {code ?? ''}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{name}</span>
                  {record.meta ? (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {record.meta}
                    </span>
                  ) : null}
                </span>
              </PickerOption>
            );
          })
        )}
      </div>
    </>
  );
}
