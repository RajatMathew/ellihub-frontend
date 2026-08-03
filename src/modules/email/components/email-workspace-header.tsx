import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { MoreHorizontal, Pencil, Settings, Unplug } from 'lucide-react';
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

  return (
    <header className="shrink-0 border-b border-border bg-muted/50 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Mailbox
            </p>
            <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
              <h1 className="truncate text-sm font-semibold text-foreground">
                {mailboxLabel ?? mailboxAddress}
              </h1>
              {mailboxLabel && mailboxLabel !== mailboxAddress && (
                <span className="hidden truncate text-xs text-muted-foreground md:inline">
                  {mailboxAddress}
                </span>
              )}
            </div>
          </div>

          {hasAccountActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  size="icon"
                  className="size-10 shrink-0 sm:size-9"
                  aria-label="Mailbox settings"
                >
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </Button>
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
          )}
        </div>

        <Tabs
          value={activeView}
          onValueChange={(value) => onViewChange(value as EmailWorkspaceView)}
        >
          <TabsList
            variant="line"
            size="md"
            className="w-full justify-start gap-6 border-b-0 sm:w-auto"
            aria-label="Mailbox workspace"
          >
            <TabsTrigger value="mail" className="min-h-10 px-1 sm:min-h-9">
              Mail
            </TabsTrigger>
            <TabsTrigger value="tasks" className="min-h-10 px-1 sm:min-h-9">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="calendar" className="min-h-10 px-1 sm:min-h-9">
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </header>
  );
}
