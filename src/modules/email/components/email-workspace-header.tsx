import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { BREADCRUMB_PAGE_ACTIONS_ID } from '@/app/components/header/header-breadcrumbs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Mail, MoreHorizontal, Pencil, Settings, Unplug } from 'lucide-react';
import { Link } from 'react-router-dom';

export type EmailWorkspaceView = 'mail' | 'tasks' | 'calendar';

interface EmailWorkspaceHeaderProps {
  mailboxAddress: string;
  mailboxLabel?: string;
  activeView: EmailWorkspaceView;
  onViewChange: (view: EmailWorkspaceView) => void;
  onEditNickname?: () => void;
  onDisconnectAccount?: () => void;
  isDisconnectingAccount?: boolean;
}

export function EmailWorkspaceHeader({
  mailboxAddress,
  mailboxLabel,
  activeView,
  onViewChange,
  onEditNickname,
  onDisconnectAccount,
  isDisconnectingAccount = false,
}: EmailWorkspaceHeaderProps) {
  const hasAccountActions = Boolean(onEditNickname || onDisconnectAccount);
  // The settings menu docks next to the account crumb in the top breadcrumb
  // bar. That bar is hidden on mobile, so fall back to rendering inline here.
  const [breadcrumbSlot, setBreadcrumbSlot] = useState<HTMLElement | null>(() =>
    document.getElementById(BREADCRUMB_PAGE_ACTIONS_ID)
  );
  useEffect(() => {
    // On a hard load the breadcrumb bar commits in the same pass as this
    // component, so the slot isn't in the DOM yet during the initial render —
    // look it up again once the frame has painted.
    const frame = requestAnimationFrame(() => {
      setBreadcrumbSlot(document.getElementById(BREADCRUMB_PAGE_ACTIONS_ID));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const accountActionsMenu = hasAccountActions && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-hidden hover:bg-surface-hover hover:text-foreground focus-visible:bg-surface-hover focus-visible:text-foreground motion-safe:transition-colors motion-safe:duration-100"
          aria-label="Mailbox settings"
        >
          <MoreHorizontal aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {onEditNickname && (
          <DropdownMenuItem onClick={onEditNickname}>
            <Pencil aria-hidden="true" />
            Rename mailbox
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/app/email/accounts">
            <Settings aria-hidden="true" />
            Manage accounts
          </Link>
        </DropdownMenuItem>
        {onDisconnectAccount && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isDisconnectingAccount}
              onClick={onDisconnectAccount}
            >
              <Unplug aria-hidden="true" />
              {isDisconnectingAccount ? 'Disconnecting…' : 'Disconnect account'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="shrink-0 border-b border-border bg-muted/50 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-primary shadow-xs"
            aria-hidden="true"
          >
            <Mail className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight text-foreground">
              {mailboxLabel ?? mailboxAddress}
            </h1>
            {mailboxLabel && mailboxLabel !== mailboxAddress && (
              <p className="truncate text-xs leading-tight text-muted-foreground">
                {mailboxAddress}
              </p>
            )}
          </div>

          {accountActionsMenu &&
            (breadcrumbSlot
              ? createPortal(accountActionsMenu, breadcrumbSlot)
              : accountActionsMenu)}
        </div>

        <Tabs
          value={activeView}
          onValueChange={(value) => onViewChange(value as EmailWorkspaceView)}
        >
          <TabsList
            variant="default"
            size="md"
            className="w-full rounded-lg bg-muted sm:w-auto"
            aria-label="Mailbox workspace"
          >
            <TabsTrigger
              value="mail"
              className="min-h-9 flex-1 border border-transparent px-4 data-[state=active]:border-border data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:shadow-black/10 sm:flex-initial"
            >
              Mail
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="min-h-9 flex-1 border border-transparent px-4 data-[state=active]:border-border data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:shadow-black/10 sm:flex-initial"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="min-h-9 flex-1 border border-transparent px-4 data-[state=active]:border-border data-[state=active]:border-b-2 data-[state=active]:border-b-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm data-[state=active]:shadow-black/10 sm:flex-initial"
            >
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
