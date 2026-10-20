import { useMemo, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import type { ConnectedEmailTag } from '@/modules/email/api';
import {
  canCreateTag,
  matchTagOptions,
  tagPickerOptions,
  type EmailTagSide,
  type TagPickerOption,
} from '@/modules/email/lib/email-tag-presets';
import { Check, Plus, Search, X } from 'lucide-react';
import { Popover as PopoverPrimitive } from 'radix-ui';

/**
 * A thread's tags (elli-ui#1470): only the ones it carries, as chips, and a
 * picker for the rest. Tags grow with every one somebody makes, so laying all
 * of them out as a row stopped scaling; the picker searches them, creates a
 * missing one, and ticks several before closing.
 */
export function MailThreadTags({
  side = 'other',
  showLabel = true,
  bordered = false,
  tags,
  appliedNames,
  disabled,
  creatingNames = [],
  onToggle,
  onCreate,
}: {
  /** Which side of the Project / Other switch: it decides the presets offered. */
  side?: EmailTagSide;
  showLabel?: boolean;
  /** Draws the hairline the details panel puts between its sections. */
  bordered?: boolean;
  /** Elli's own tags. Provider categories are read-only and never offered. */
  tags: ConnectedEmailTag[];
  appliedNames: string[];
  disabled?: boolean;
  /** Tags whose create is in flight: no id yet, so a second click would create them twice. */
  creatingNames?: string[];
  onToggle?: (tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreate?: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  const applied = useMemo(
    () => new Set(appliedNames.map((name) => name.toLowerCase())),
    [appliedNames]
  );
  const creating = new Set(creatingNames.map((name) => name.toLowerCase()));
  const options = useMemo(
    () => tagPickerOptions(side, tags, appliedNames),
    [side, tags, appliedNames]
  );
  const matches = matchTagOptions(options, query);
  const canCreate = Boolean(onCreate) && canCreateTag(options, query);
  const rowCount = matches.length + (canCreate ? 1 : 0);
  const chips = appliedNames.map(
    (name) => options.find((option) => option.name.toLowerCase() === name.toLowerCase()) ?? null
  );

  const isOn = (option: TagPickerOption) => applied.has(option.name.toLowerCase());
  const toggle = (option: TagPickerOption) => {
    if (creating.has(option.name.toLowerCase())) return;
    // A preset nobody has used yet: creating it is what applies it.
    if (!option.tag) onCreate?.(option.name);
    else onToggle?.(option.tag, !isOn(option));
  };
  const create = () => {
    const name = query.replace(/\s+/g, ' ').trim();
    if (!name) return;
    onCreate?.(name);
    setQuery('');
    setActive(0);
  };
  const clearAll = () => {
    for (const option of options) if (option.tag && isOn(option)) onToggle?.(option.tag, false);
  };
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setActive(0);
    }
  };

  const listLabel = query.trim()
    ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`
    : `All tags · ${options.length}`;

  return (
    <div className={cn(bordered ? 'mt-1.5 border-t border-mail-hair pt-4' : 'pt-1')}>
      {showLabel ? (
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-mail-ink">Tags</p>
          {appliedNames.length > 0 ? (
            <span className="text-[11.5px] tabular-nums text-mail-mid">
              {appliedNames.length} selected
            </span>
          ) : null}
        </div>
      ) : null}
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverPrimitive.Anchor asChild>
          <div ref={fieldRef} className="flex min-h-8 flex-wrap items-center gap-1.5">
            {appliedNames.map((name, index) => {
              const option = chips[index];
              return (
                <span
                  key={name}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-mail-chip-count/55 pl-2.5 pr-1 transition-colors hover:bg-mail-chip-count/80 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 [&:hover>button]:opacity-100"
                >
                  <span className="whitespace-nowrap text-[13px] font-semibold text-mail-ink">
                    {option?.name ?? name}
                  </span>
                  {option?.tag && onToggle ? (
                    <button
                      type="button"
                      aria-label={`Remove tag ${option.name}`}
                      disabled={disabled}
                      onClick={() => option.tag && onToggle(option.tag, false)}
                      className="grid size-[18px] cursor-pointer place-items-center rounded-full text-mail-ink opacity-45 transition-opacity hover:bg-mail-ink/10 focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                    >
                      <X aria-hidden="true" className="size-[9px]" strokeWidth={2.6} />
                    </button>
                  ) : null}
                </span>
              );
            })}
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Add tag"
                aria-haspopup="listbox"
                disabled={disabled}
                className="ml-0.5 grid size-7 cursor-pointer place-items-center rounded-full border border-dashed border-mail-line text-mail-mid transition-[background-color,border-color,color,transform] duration-200 hover:border-mail-muted hover:bg-mail-chip hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50 data-[state=open]:rotate-45 data-[state=open]:border-solid data-[state=open]:border-mail-ink data-[state=open]:bg-popover data-[state=open]:text-mail-ink"
              >
                <Plus aria-hidden="true" className="size-3" />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverPrimitive.Anchor>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={8}
          // Always below the tags, never flipped above them: when the page has
          // too little room underneath, it scrolls up to make some (see
          // `makeRoomBelow`) and the list shortens to fit what is left.
          avoidCollisions={false}
          className="flex max-h-[calc(var(--radix-popover-content-available-height)-12px)] w-[min(22.5rem,var(--radix-popover-trigger-width))] flex-col rounded-xl border-mail-line bg-popover p-1.5 shadow-[0_18px_40px_-14px_rgb(43_40_37/0.22),0_2px_6px_rgb(43_40_37/0.06)]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus({ preventScroll: true });
            makeRoomBelow(fieldRef.current, PICKER_HEIGHT);
          }}
        >
          <label className="mx-0.5 mb-1.5 mt-0.5 flex h-8 shrink-0 items-center gap-2 rounded-md border border-mail-line bg-mail-paper px-3 text-mail-mid transition-[border-color,box-shadow] focus-within:border-mail-muted focus-within:shadow-[0_0_0_3px_rgb(43_40_37/0.07)]">
            <Search aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActive((index) => Math.min(index + 1, Math.max(rowCount - 1, 0)));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive((index) => Math.max(index - 1, 0));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const option = matches[active];
                  if (option) toggle(option);
                  else if (canCreate) create();
                }
              }}
              placeholder="Search or create a tag"
              aria-label="Search tags"
              role="combobox"
              aria-expanded="true"
              aria-controls="mail-tag-list"
              aria-activedescendant={rowCount > 0 ? `mail-tag-option-${active}` : undefined}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-mail-ink outline-none placeholder:text-mail-muted"
            />
          </label>

          <p className="shrink-0 px-2.5 pb-1 pt-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-mail-muted">
            {listLabel}
          </p>

          <div
            id="mail-tag-list"
            role="listbox"
            aria-multiselectable="true"
            className="flex max-h-52 min-h-0 flex-1 flex-col gap-px overflow-y-auto px-0.5 [scrollbar-width:thin]"
          >
            {matches.map((option, index) => {
              const on = isOn(option);
              return (
                <button
                  key={option.name}
                  id={`mail-tag-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={on}
                  tabIndex={-1}
                  disabled={creating.has(option.name.toLowerCase())}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => {
                    toggle(option);
                    inputRef.current?.focus();
                  }}
                  ref={(element) => {
                    if (element && index === active) element.scrollIntoView({ block: 'nearest' });
                  }}
                  className={cn(
                    'flex min-h-8 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left disabled:cursor-default disabled:opacity-60',
                    index === active && 'bg-mail-chip'
                  )}
                >
                  <TagCheckbox on={on} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-[13px] text-mail-ink',
                      on ? 'font-semibold' : 'font-medium'
                    )}
                  >
                    {option.name}
                  </span>
                  {option.custom ? (
                    <span className="text-[11px] text-mail-muted">Custom</span>
                  ) : null}
                </button>
              );
            })}
            {canCreate ? (
              <button
                id={`mail-tag-option-${matches.length}`}
                type="button"
                role="option"
                aria-selected="false"
                tabIndex={-1}
                onMouseEnter={() => setActive(matches.length)}
                onClick={() => {
                  create();
                  inputRef.current?.focus();
                }}
                className={cn(
                  'flex min-h-8 w-full shrink-0 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left',
                  active === matches.length && 'bg-mail-chip'
                )}
              >
                <span className="grid size-4 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-dashed border-mail-ink text-mail-ink">
                  <Plus aria-hidden="true" className="size-2.5" strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-mail-ink">
                  Create “{query.replace(/\s+/g, ' ').trim()}”
                </span>
                <span className="text-[11px] text-mail-muted">Enter ↵</span>
              </button>
            ) : null}
            {rowCount === 0 ? (
              <p className="px-3 py-3.5 text-[13px] text-mail-mid">No tags found.</p>
            ) : null}
          </div>

          <div className="mt-1.5 flex shrink-0 items-center justify-between border-t border-mail-line px-2.5 pb-0.5 pt-2">
            <span className="text-xs tabular-nums text-mail-mid">
              {appliedNames.length} selected
            </span>
            <span className="flex items-center gap-4">
              {appliedNames.length > 0 && onToggle ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="cursor-pointer text-xs font-medium text-mail-mid hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => changeOpen(false)}
                className="cursor-pointer text-xs font-semibold text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                Done
              </button>
            </span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** The picker at its full height: search, heading, six rows and the footer. */
const PICKER_HEIGHT = 330;

/**
 * Scrolls the nearest scrolling ancestor of `anchor` just far enough that
 * `height` pixels fit below it on screen, so the picker opens downward at its
 * full size rather than squeezed against the bottom edge. Nothing scrolls when
 * it already fits, and never further than the content allows.
 */
function makeRoomBelow(anchor: HTMLElement | null, height: number) {
  if (!anchor) return;
  const shortfall = anchor.getBoundingClientRect().bottom + height - window.innerHeight;
  if (shortfall <= 0) return;
  let scroller: HTMLElement | null = anchor.parentElement;
  while (scroller) {
    const { overflowY } = getComputedStyle(scroller);
    if (/(auto|scroll)/.test(overflowY) && scroller.scrollHeight > scroller.clientHeight) break;
    scroller = scroller.parentElement;
  }
  (scroller ?? document.scrollingElement)?.scrollBy({ top: shortfall, behavior: 'smooth' });
}

function TagCheckbox({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[4px] border-[1.5px] transition-colors',
        on ? 'border-mail-ink bg-mail-ink text-popover' : 'border-mail-line bg-popover'
      )}
    >
      {on ? <Check className="size-2.5" strokeWidth={3.2} /> : null}
    </span>
  );
}
