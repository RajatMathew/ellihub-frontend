import { cn } from '@/app/lib/utils';
import { NavLink } from 'react-router-dom';

type PageTabValue = string | number | null;

interface BasePageTabItem<TValue extends PageTabValue = PageTabValue> {
  label: string;
  value: TValue;
}

export interface PageTabLinkItem<
  TValue extends PageTabValue = PageTabValue,
> extends BasePageTabItem<TValue> {
  to: string;
}

export interface PageTabButtonItem<
  TValue extends PageTabValue = PageTabValue,
> extends BasePageTabItem<TValue> {
  to?: never;
}

export type PageTabItem<TValue extends PageTabValue = PageTabValue> =
  | PageTabButtonItem<TValue>
  | PageTabLinkItem<TValue>;

interface PageTabsProps<TValue extends PageTabValue = PageTabValue> {
  items: PageTabItem<TValue>[];
  activeValue?: TValue;
  onValueChange?: (value: TValue) => void;
  ariaLabel: string;
  className?: string;
}

const tabClassName = (isActive: boolean) =>
  cn(
    'relative shrink-0 px-4 pt-1 pb-2.5 text-sm uppercase tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    isActive
      ? 'font-semibold text-foreground'
      : 'font-medium text-muted-foreground hover:cursor-pointer hover:text-foreground'
  );

function ActiveIndicator() {
  return <span className="absolute inset-x-1 bottom-0 h-0.5 bg-primary" />;
}

export function PageTabs<TValue extends PageTabValue = PageTabValue>({
  items,
  activeValue,
  onValueChange,
  ariaLabel,
  className,
}: PageTabsProps<TValue>) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        '-mx-4 -mb-3 border-y border-border bg-project-tabs-background px-4 pt-1.5 lg:-mx-7.5 lg:px-7.5',
        className
      )}
    >
      <div className="-mx-1 flex overflow-x-auto px-1">
        {items.map((item) =>
          item.to ? (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => tabClassName(isActive)}
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && <ActiveIndicator />}
                </>
              )}
            </NavLink>
          ) : (
            <button
              key={item.label}
              type="button"
              aria-pressed={Object.is(item.value, activeValue)}
              onClick={() => onValueChange?.(item.value)}
              className={tabClassName(Object.is(item.value, activeValue))}
            >
              {item.label}
              {Object.is(item.value, activeValue) && <ActiveIndicator />}
            </button>
          )
        )}
      </div>
    </nav>
  );
}
