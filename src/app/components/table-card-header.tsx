import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { ChevronLeft, ChevronRight, Search, X, type LucideProps } from 'lucide-react';

/**
 * The table card header.
 *
 * Three slots, in this order, at every breakpoint:
 *
 *   title            tabs, or a label — whatever names the list
 *   filters          the controls, which may wrap
 *   trailing         Clear, and anything else that acts on the filters
 *
 * The split exists because a single wrapping row put Clear wherever it landed —
 * left-aligned on its own line at narrow widths, and each header justified it
 * differently. Trailing is a separate, non-wrapping box pinned to the end, so
 * Clear sits on the right whatever the filters do.
 *
 * Controls in here carry no colour of their own. `CardHeader` stamps
 * `data-surface="card-header"`, and the token block in `globals.css` remaps the
 * palette for the subtree — so `Button`, `Input` and `Select` render correctly
 * against the header's background without being told they are in one.
 *
 * `size="toolbar"` is the 32px row every control here sits on. Anything added to
 * this header takes that size; nothing hand-writes a height.
 */

type TableCardHeaderProps = {
  title?: ReactNode;
  /** The filter controls. May wrap. */
  actions?: ReactNode;
  /** Pinned to the end of the row, never wrapping below the controls. */
  trailing?: ReactNode;
};

type TableCardHeaderTab = { label: string; value?: string };

interface TableCardHeaderTabsProps {
  activeValue?: string;
  isLoading?: boolean;
  tabs: TableCardHeaderTab[];
  className?: string;
  onChange: (value: string | undefined) => void;
}

type TableCardHeaderSearchScope = {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
};

type TableCardHeaderSearchProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  /** Segmented control inside the input, narrowing what the search covers. */
  scope?: TableCardHeaderSearchScope;
  className?: string;
};

interface TableCardHeaderSelectProps {
  value: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  icon?: ComponentType<LucideProps>;
  onValueChange: (value: string) => void;
  className?: string;
}

function TableCardHeader({ title, actions, trailing }: TableCardHeaderProps) {
  return (
    <CardHeader className="items-stretch py-0">
      {title && <CardTitle className="flex min-h-11 items-stretch">{title}</CardTitle>}
      {(actions || trailing) && (
        <CardToolbar className="w-full flex-nowrap py-1.5 sm:w-auto">
          <TableCardHeaderToolbar>
            {actions}
            {trailing}
          </TableCardHeaderToolbar>
        </CardToolbar>
      )}
    </CardHeader>
  );
}

/**
 * The label that names a list, when it is not a tab strip.
 *
 * One typography treatment for every list, rather than each page restating its
 * own. `description` is the second line Activity Log needs; the skeleton keeps
 * the row's height while the count it usually contains is still loading.
 */
function TableCardHeaderTitle({
  children,
  description,
  isLoading,
}: {
  children: ReactNode;
  description?: ReactNode;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <span className="flex min-h-11 flex-col justify-center gap-1">
        <Skeleton className="h-4 w-40" />
        {description !== undefined && <Skeleton className="h-3 w-24" />}
      </span>
    );
  }

  return (
    <span className="flex min-h-11 min-w-0 flex-col justify-center gap-1">
      <span className="truncate text-sm font-bold tracking-normal text-table-card-header-foreground">
        {children}
      </span>
      {description !== undefined && (
        <span className="truncate text-xs text-table-card-header-foreground/75">{description}</span>
      )}
    </span>
  );
}

/**
 * Tab strip for the title slot.
 *
 * Scrolls rather than wraps when the tabs outrun the space, with an arrow at
 * each end that appears only when there is something in that direction. RFQ had
 * a hand-built version of this with a *forward arrow only*, so scrolling right
 * left no way back; and the wrapping version this replaces made the header grow
 * several rows tall on a narrow screen.
 *
 * The arrows are absolutely positioned, so appearing and disappearing moves
 * nothing.
 */
function TableCardHeaderTabs({
  activeValue,
  isLoading,
  tabs,
  className,
  onChange,
}: TableCardHeaderTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ end: false, start: false });

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const update = () => {
      // `scrollLeft` is negative in RTL in some engines; the distance from each
      // edge is what matters, not the sign.
      const position = Math.abs(element.scrollLeft);
      const max = element.scrollWidth - element.clientWidth;
      const next = { end: max > 1 && position < max - 1, start: position > 1 };

      // Compare before setting. A fresh object every scroll event is never
      // `Object.is`-equal, so React would re-render on every frame of a scroll —
      // and, because this effect re-subscribes whenever `tabs` changes identity,
      // that render would tear the listener down and rebuild it mid-scroll.
      setOverflow((current) =>
        current.start === next.start && current.end === next.end ? current : next
      );
    };

    update();
    element.addEventListener('scroll', update, { passive: true });

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      element.removeEventListener('scroll', update);
      observer.disconnect();
    };
    // Length, not the array: callers build `tabs` inline, so its identity changes
    // every render and the subscription would never survive one.
  }, [tabs.length]);

  const scroll = (direction: 'start' | 'end') => {
    const element = scrollRef.current;
    if (!element) return;

    const step = Math.max(element.clientWidth * 0.75, 180);
    // Animate only where animation is wanted and available. A `smooth` request
    // is a no-op in engines that suppress scroll animation, which would leave
    // the arrow doing nothing at all — jumping is the right degradation, not
    // silence.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    element.scrollBy({
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
      left: direction === 'end' ? step : -step,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-11 items-center gap-2 py-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-28" />
      </div>
    );
  }

  return (
    <div className={cn('relative flex min-h-11 min-w-0 max-w-full items-stretch', className)}>
      <div
        ref={scrollRef}
        className="flex min-w-0 items-stretch overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-nowrap items-stretch">
          {tabs.map((tab) => (
            <button
              key={tab.value ?? '__all'}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                'relative z-10 flex shrink-0 cursor-pointer items-center whitespace-nowrap px-3 font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4',
                activeValue === tab.value
                  ? 'text-table-card-header-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-table-card-tab-accent'
                  : 'text-table-card-header-foreground/75 hover:text-table-card-header-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <TabScrollArrow direction="start" visible={overflow.start} onClick={() => scroll('start')} />
      <TabScrollArrow direction="end" visible={overflow.end} onClick={() => scroll('end')} />
    </div>
  );
}

/**
 * One end of the tab scroller: a fade over the tabs plus a button.
 *
 * `pointer-events-none` on the fade so it never eats a click meant for a tab
 * underneath it; the button itself opts back in.
 */
function TabScrollArrow({
  direction,
  visible,
  onClick,
}: {
  direction: 'start' | 'end';
  visible: boolean;
  onClick: () => void;
}) {
  if (!visible) return null;

  const isEnd = direction === 'end';

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-y-0 z-20 flex w-16 items-center',
        isEnd
          ? 'end-0 justify-end bg-gradient-to-l from-card-header via-card-header/90 to-transparent'
          : 'start-0 justify-start bg-gradient-to-r from-card-header via-card-header/90 to-transparent'
      )}
    >
      <button
        aria-hidden="true"
        className="pointer-events-auto flex size-5 cursor-pointer items-center justify-center rounded-full border border-table-card-header-foreground/45 bg-card-header text-table-card-header-foreground/80 shadow-xs shadow-black/10 transition-colors hover:text-table-card-header-foreground"
        tabIndex={-1}
        type="button"
        onClick={onClick}
      >
        {isEnd ? (
          <ChevronRight className="size-3.5" strokeWidth={2} />
        ) : (
          <ChevronLeft className="size-3.5" strokeWidth={2} />
        )}
      </button>
    </div>
  );
}

/**
 * The control row. Filters wrap inside it; `trailing` never does.
 *
 * Children are split by `data-header-slot="trailing"`, so a caller composes both
 * groups as ordinary children rather than threading a second prop through every
 * header variant.
 */
function TableCardHeaderToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center',
        '[&>[data-header-slot=trailing]]:shrink-0 sm:[&>[data-header-slot=trailing]]:ms-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

/** The filters group. Wraps freely; always sits before `trailing`. */
function TableCardHeaderFilters({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Pinned to the end of the row. Right-aligned at every breakpoint.
 *
 * `empty:hidden` because the only thing in here is usually the Clear button,
 * which unmounts when there is nothing to clear — without it the slot would
 * still contribute the toolbar's gap and leave a phantom 8px on every unfiltered
 * list.
 */
function TableCardHeaderTrailing({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-header-slot="trailing"
      className={cn('flex items-center justify-end gap-2 empty:hidden', className)}
    >
      {children}
    </div>
  );
}

function TableCardHeaderSearch({
  value,
  placeholder,
  onChange,
  scope,
  className,
}: TableCardHeaderSearchProps) {
  return (
    <InputWrapper
      variant="toolbar"
      className={cn('w-full shadow-xs shadow-black/10 sm:w-64', scope && 'sm:w-80', className)}
    >
      <Search strokeWidth={2} />
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      {scope && (
        // Inline, not a panel that appears on focus. The overlay Files used sat
        // on top of the first table row and existed nowhere else in the app.
        <div className="-me-1.5 flex shrink-0 items-center gap-0.5 border-s border-current/20 ps-1.5">
          {scope.options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={scope.value === option.value}
              className={cn(
                'cursor-pointer rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium leading-none transition-colors',
                scope.value === option.value
                  ? 'bg-current/15 text-current'
                  : 'text-current/60 hover:text-current'
              )}
              onClick={() => scope.onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </InputWrapper>
  );
}

function TableCardHeaderSelect({
  value,
  placeholder,
  options,
  icon: Icon,
  onValueChange,
  className,
}: TableCardHeaderSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="toolbar"
        className={cn(
          'w-full cursor-pointer justify-start font-medium shadow-xs shadow-black/10 sm:w-44 [&>span]:min-w-0 [&>span]:truncate [&>span]:text-left [&>svg:last-child]:ms-auto',
          className
        )}
      >
        {Icon && <Icon className="size-4 shrink-0" strokeWidth={2} />}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Clears every filter. Renders nothing until there is something to clear.
 *
 * This used to stay mounted and `invisible`, holding its space so the row could
 * not reflow. That bought a still header at the cost of a permanent gap on every
 * list, including the ones nobody has filtered — which is most of them, most of
 * the time. Unmounting shifts the controls once, on a click the user just made,
 * at the same moment the chip row appears anyway.
 */
function TableCardHeaderClearButton({
  active,
  onClick,
  label = 'Clear',
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
}) {
  if (!active) return null;

  return (
    <Button
      variant="outline"
      size="toolbar"
      className="shadow-xs shadow-black/10"
      onClick={onClick}
    >
      <X strokeWidth={2} />
      {label}
    </Button>
  );
}

export {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderFilters,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderTabs,
  TableCardHeaderTitle,
  TableCardHeaderToolbar,
  TableCardHeaderTrailing,
};
