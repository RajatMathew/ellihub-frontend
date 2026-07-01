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

type TableCardHeaderProps = { title?: ReactNode; actions?: ReactNode };
type TableCardHeaderTab = { label: string; value?: string };

interface TableCardHeaderTabsProps {
  activeValue?: string;
  isLoading?: boolean;
  tabs: TableCardHeaderTab[];
  onChange: (value: string | undefined) => void;
}

type TableCardHeaderSearchProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
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

const controlTextClassName =
  '!text-xs !font-medium !leading-none !text-table-card-header-foreground placeholder:!text-table-card-header-foreground';

const controlIconClassName = 'size-4 shrink-0 text-table-card-header-foreground';

const controlShellClassName =
  'h-8 rounded-md border-table-card-header-foreground/25 bg-card-header text-xs font-medium leading-none text-table-card-header-foreground shadow-xs shadow-black/10 brightness-100 hover:border-table-card-header-foreground/40 hover:bg-card-header hover:brightness-105';

const selectTriggerClassName = cn(
  controlShellClassName,
  'w-full cursor-pointer justify-start gap-2 px-3 focus-visible:!border-table-card-header-foreground/40 focus-visible:!outline-none focus-visible:!ring-0 data-[placeholder]:!text-table-card-header-foreground data-[state=open]:!border-table-card-header-foreground/40 data-[state=open]:!bg-card-header data-[state=open]:brightness-105 data-[state=open]:!ring-0 sm:w-44 [&>span]:min-w-0 [&>span]:text-left [&>svg:last-child]:ms-auto [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:cursor-pointer [&_svg]:!text-table-card-header-foreground'
);

function TableCardHeader({ title, actions }: TableCardHeaderProps) {
  return (
    <CardHeader className="items-stretch py-0">
      {title && <CardTitle className="flex min-h-11 items-stretch">{title}</CardTitle>}
      {actions && <CardToolbar className="w-full py-1.5 sm:w-auto">{actions}</CardToolbar>}
    </CardHeader>
  );
}

function TableCardHeaderTabs({ activeValue, isLoading, tabs, onChange }: TableCardHeaderTabsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center gap-2 py-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-28" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-11 items-stretch gap-0">
      {tabs.map((tab) => (
        <button
          key={tab.value ?? '__all'}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative z-10 flex cursor-pointer items-center px-4 font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
            activeValue === tab.value
              ? '!text-table-card-header-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-table-card-tab-accent'
              : '!text-table-card-header-foreground/75 hover:!text-table-card-header-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function TableCardHeaderToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center', className)}
    >
      {children}
    </div>
  );
}

function TableCardHeaderSearch({
  value,
  placeholder,
  onChange,
  className,
}: TableCardHeaderSearchProps) {
  return (
    <InputWrapper
      variant="sm"
      className={cn(
        controlShellClassName,
        'w-full gap-2 px-3 has-[:focus-visible]:border-table-card-header-foreground/40 has-[:focus-visible]:!outline-none has-[:focus-visible]:!ring-0 sm:w-64 [&_[data-slot=input]]:!text-xs [&_[data-slot=input]]:!font-medium [&_[data-slot=input]]:!leading-none [&_[data-slot=input]]:!text-table-card-header-foreground [&_[data-slot=input]]:placeholder:!text-table-card-header-foreground [&_[data-slot=input]]:focus-visible:!outline-none [&_[data-slot=input]]:focus-visible:!ring-0 [&_svg]:size-4 [&_svg]:cursor-pointer [&_svg]:!text-table-card-header-foreground',
        className
      )}
    >
      <Search className={controlIconClassName} strokeWidth={2} />
      <Input
        className={controlTextClassName}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
      <SelectTrigger className={cn(selectTriggerClassName, className)}>
        {Icon && <Icon className={controlIconClassName} strokeWidth={2} />}
        <SelectValue className={controlTextClassName} placeholder={placeholder} />
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
      variant="ghost"
      size="sm"
      className={cn(
        controlShellClassName,
        'gap-2 border px-3 !text-table-card-header-foreground hover:!text-table-card-header-foreground [&_svg]:size-4 [&_svg]:!text-table-card-header-foreground',
        !active && 'invisible pointer-events-none'
      )}
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
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderTabs,
  TableCardHeaderToolbar,
};
