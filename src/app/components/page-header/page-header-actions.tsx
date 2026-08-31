import type { ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import { MoreHorizontal, PanelRightOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ToolbarActions } from './internal/toolbar';
import type { ActionDef, PanelDef } from './page-header.types';
import { usePageHeaderActions } from './use-page-header-actions';

interface PageHeaderActionsProps {
  actions?: ActionDef[];
  panel?: PanelDef;
  /** Rendered before the resolved actions — for controls the model cannot express. */
  leadingActions?: ReactNode;
  /** Rendered after everything, including the panel toggle. Form submit lives here. */
  trailingActions?: ReactNode;
}

function ActionButton({ action, isPrimary }: { action: ActionDef; isPrimary: boolean }) {
  const Icon = action.icon;
  const content = (
    <>
      {Icon && <Icon className={cn('size-4', action.pending && 'animate-spin')} />}
      {action.label}
    </>
  );

  const variant = action.destructive ? 'destructive' : isPrimary ? 'primary' : 'outline';

  if (action.to && !action.disabled) {
    return (
      <Button variant={variant} size="sm" className="w-full sm:w-auto" asChild>
        <Link to={action.to}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size="sm"
      type="button"
      className="w-full sm:w-auto"
      disabled={action.disabled}
      title={action.disabled ? action.disabledReason : undefined}
      onClick={action.onClick}
    >
      {content}
    </Button>
  );
}

function OverflowItem({ action }: { action: ActionDef }) {
  const Icon = action.icon;
  const content = (
    <>
      {Icon && <Icon className="size-4" />}
      {action.label}
    </>
  );

  if (action.to) {
    return (
      <DropdownMenuItem asChild disabled={action.disabled}>
        <Link to={action.to}>{content}</Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      variant={action.destructive ? 'destructive' : undefined}
      disabled={action.disabled}
      title={action.disabled ? action.disabledReason : undefined}
      onClick={action.onClick}
    >
      {content}
    </DropdownMenuItem>
  );
}

/**
 * The header's action region: inline buttons, an overflow menu, the primary
 * call to action, then the side-panel toggle.
 *
 * Destructive overflow items are pushed last and separated, so "Archive" never
 * sits a pixel away from "Edit" in one list.
 */
export function PageHeaderActions({
  actions,
  panel,
  leadingActions,
  trailingActions,
}: PageHeaderActionsProps) {
  const resolved = usePageHeaderActions(actions);
  const showPanelToggle = panel !== undefined && !panel.open;

  if (resolved.isEmpty && !showPanelToggle && !leadingActions && !trailingActions) return null;

  const safeOverflow = resolved.overflow.filter((action) => !action.destructive);
  const destructiveOverflow = resolved.overflow.filter((action) => action.destructive);

  return (
    <ToolbarActions className="w-full flex-wrap sm:w-auto sm:justify-end">
      {leadingActions}

      {resolved.inline.map((action) => (
        <ActionButton key={action.label} action={action} isPrimary={false} />
      ))}

      {resolved.overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" mode="icon">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">More actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {safeOverflow.map((action) => (
              <OverflowItem key={action.label} action={action} />
            ))}
            {destructiveOverflow.length > 0 && safeOverflow.length > 0 && <DropdownMenuSeparator />}
            {destructiveOverflow.map((action) => (
              <OverflowItem key={action.label} action={action} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {resolved.primary.map((action) => (
        <ActionButton key={action.label} action={action} isPrimary />
      ))}

      {showPanelToggle && (
        <Button
          variant="outline"
          size="sm"
          type="button"
          className="w-full sm:w-auto"
          onClick={panel.onOpen}
        >
          <PanelRightOpen className="size-4" />
          {panel.label ?? 'View Details'}
        </Button>
      )}

      {trailingActions}
    </ToolbarActions>
  );
}
