import { Fragment, type ComponentType, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { MoreHorizontal, type LucideProps } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface RowAction {
  label: string;
  /** Navigates. Renders a real link, so middle-click and open-in-new-tab work. */
  to?: string;
  /** Performs an action. Ignored when `to` is set. */
  onSelect?: () => void;
  icon?: ComponentType<LucideProps>;
  /** Renders in the destructive style, below a separator. */
  destructive?: boolean;
  disabled?: boolean;
  /**
   * Drop the item entirely. Prefer this over building the array conditionally at
   * the call site — a permission check reads better beside the item it gates.
   */
  hidden?: boolean;
}

export interface RowActionsProps {
  /** Falsy entries are dropped, so `canEdit && {…}` works inline. */
  items: (RowAction | false | null | undefined)[];
  /**
   * Names the record, e.g. `"Acme Corp"` — rendered as "Open actions for Acme
   * Corp". Required: twenty triggers all called "Actions" is not a table anyone
   * can use with a screen reader.
   */
  label: string;
  className?: string;
}

/**
 * The `⋯` menu at the end of a row.
 *
 * Replaces ten near-identical dropdowns that had drifted apart on every detail
 * that was left to the call site: an `aria-label` on some and an `sr-only` span
 * on others, three different trigger sizes, `variant="destructive"` on the menu
 * item versus a hand-written `text-destructive` class, and a `justify-end`
 * wrapper on one of them.
 *
 * Rows carry links and their own click handlers, so the trigger stops
 * propagation — a row-level `onClick` must not fire when the menu opens.
 */
export function RowActions({ items, label, className }: RowActionsProps) {
  const visible = items.filter(
    (item): item is RowAction => item !== false && item != null && !item.hidden
  );

  if (visible.length === 0) return null;

  const regular = visible.filter((item) => !item.destructive);
  const destructive = visible.filter((item) => item.destructive);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${label}`}
          className={cn('size-7', className)}
          mode="icon"
          size="sm"
          variant="ghost"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {regular.map((item) => (
          <RowActionItem key={item.label} item={item} />
        ))}
        {destructive.length > 0 && (
          <Fragment>
            {regular.length > 0 && <DropdownMenuSeparator />}
            {destructive.map((item) => (
              <RowActionItem key={item.label} item={item} />
            ))}
          </Fragment>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowActionItem({ item }: { item: RowAction }) {
  const Icon = item.icon;
  const content: ReactNode = (
    <>
      {Icon && <Icon className="size-4" />}
      {item.label}
    </>
  );

  if (item.to) {
    return (
      <DropdownMenuItem
        asChild
        disabled={item.disabled}
        variant={item.destructive ? 'destructive' : undefined}
      >
        <Link to={item.to}>{content}</Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      disabled={item.disabled}
      variant={item.destructive ? 'destructive' : undefined}
      onClick={item.onSelect}
    >
      {content}
    </DropdownMenuItem>
  );
}
