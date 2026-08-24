import type { ComponentType, ReactNode } from 'react';

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
import { Search, X, type LucideProps } from 'lucide-react';

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
 * Wraps below `sm` and runs on one line above it. This was two components —
 * `TableCardHeaderTabs` and the project modules' `ProjectFilterTabs` — rendering
 * the same design with different padding and wrapping.
 */
function TableCardHeaderTabs({
  activeValue,
  isLoading,
  tabs,
  className,
  onChange,
}: TableCardHeaderTabsProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-11 flex-wrap items-center gap-2 py-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-28" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex min-h-11 min-w-0 flex-wrap items-stretch gap-1 sm:inline-flex sm:flex-nowrap sm:gap-0',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value ?? '__all'}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative z-10 flex cursor-pointer items-center px-3 font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4',
            activeValue === tab.value
              ? 'text-table-card-header-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-table-card-tab-accent'
              : 'text-table-card-header-foreground/75 hover:text-table-card-header-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
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

/** Pinned to the end of the row. Right-aligned at every breakpoint. */
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
      className={cn('flex items-center justify-end gap-2', className)}
    >
      {children}
    </div>
  );
}

/**
 * Keeps a conditional control's space while it is hidden.
 *
 * A header control that mounts and unmounts reflows the row, and the row is
 * directly above the table — so the table moves too. Reserving the space costs a
 * gap that is always there, which is the cheaper of the two.
 */
function Reserve({
  when,
  children,
  className,
}: {
  when: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden={!when}
      inert={!when}
      className={cn('flex items-center', !when && 'pointer-events-none invisible', className)}
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

function TableCardHeaderClearButton({
  active,
  onClick,
  label = 'Clear',
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      variant="outline"
      size="toolbar"
      className={cn('shadow-xs shadow-black/10', !active && 'pointer-events-none invisible')}
      aria-hidden={!active}
      tabIndex={active ? undefined : -1}
      onClick={onClick}
    >
      <X strokeWidth={2} />
      {label}
    </Button>
  );
}

export {
  Reserve,
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
