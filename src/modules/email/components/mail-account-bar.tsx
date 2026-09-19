import { useMemo, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/lib/utils';
import type { EmailAccount } from '@/modules/email/api';
import { EmailDisplaySettingsDialog } from '@/modules/email/components/email-display-settings-dialog';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import {
  Check,
  ChevronDown,
  LogOut,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export type EmailWorkspaceView = 'mail' | 'tasks' | 'calendar';

const WORKSPACE_TABS: Array<{ value: EmailWorkspaceView; label: string }> = [
  { value: 'mail', label: 'Mail' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'calendar', label: 'Calendar' },
];

interface MailAccountBarProps {
  /** The mailbox on screen. Absent only while the account list is loading. */
  account?: EmailAccount;
  mailboxAddress: string;
  accounts: EmailAccount[];
  canAddAccount?: boolean;
  activeView: EmailWorkspaceView;
  onViewChange: (view: EmailWorkspaceView) => void;
  onEditNickname?: () => void;
  onDisconnectAccount?: () => void;
}

/**
 * The mailbox's own top bar: which mailbox you are in and which of its three
 * views you are looking at.
 *
 * It sits inside the app shell, under the header and beside the nav sidebar,
 * so it carries no navigation of its own beyond the mailbox — the sidebar's
 * Email section is still the way between mailboxes, and this dropdown is the
 * shorter way to the same place when the reader is already here.
 */
export function MailAccountBar({
  account,
  mailboxAddress,
  accounts,
  canAddAccount = false,
  activeView,
  onViewChange,
  onEditNickname,
  onDisconnectAccount,
}: MailAccountBarProps) {
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);
  const sharedAccounts = useMemo(
    () => accounts.filter((candidate) => candidate.sharedMailboxKey),
    [accounts]
  );
  const personalAccounts = useMemo(
    () => accounts.filter((candidate) => !candidate.sharedMailboxKey),
    [accounts]
  );

  return (
    <header className="flex min-w-0 shrink-0 items-center gap-3 border-b border-mail-line bg-mail-card px-4 py-2.5 sm:px-[18px]">
      {/* The mailbox and the menu that acts on it travel together (elli-ui#1005). */}
      <div className="flex min-w-0 items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-left text-sm font-semibold tracking-[-0.01em] text-mail-ink hover:bg-mail-paper focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
              aria-label="Switch mailbox"
            >
              <span className="min-w-0 truncate">{mailboxAddress}</span>
              <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-mail-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {sharedAccounts.length > 0 && (
              <>
                <DropdownMenuLabel className="text-[11px] font-medium text-mail-muted">
                  Common
                </DropdownMenuLabel>
                {sharedAccounts.map((candidate) => (
                  <MailboxMenuItem
                    key={candidate.id}
                    account={candidate}
                    label={candidate.displayName || candidate.mailboxAddress}
                    isActive={candidate.id === account?.id}
                  />
                ))}
              </>
            )}
            {personalAccounts.length > 0 && (
              <>
                {sharedAccounts.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-[11px] font-medium text-mail-muted">
                  Personal
                </DropdownMenuLabel>
                {personalAccounts.map((candidate) => (
                  <MailboxMenuItem
                    key={candidate.id}
                    account={candidate}
                    label={candidate.mailboxAddress || candidate.email}
                    isActive={candidate.id === account?.id}
                  />
                ))}
              </>
            )}
            {canAddAccount && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/email/add-account">
                    <Plus aria-hidden="true" />
                    Add account
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-mail-muted hover:bg-mail-paper hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
              aria-label="More mailbox actions"
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {onEditNickname && (
              <DropdownMenuItem onClick={onEditNickname}>
                <Pencil aria-hidden="true" />
                Rename mailbox
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link to="/app/email/accounts">
                <Mail aria-hidden="true" />
                Manage accounts
              </Link>
            </DropdownMenuItem>
            {onDisconnectAccount && (
              <DropdownMenuItem variant="destructive" onClick={onDisconnectAccount}>
                <LogOut aria-hidden="true" />
                Log out
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/*
        Display settings sits to the left of the view switcher and the account
        menu beside the mailbox it acts on, rather than both being stranded
        together at the far right of the bar (elli-ui#1005).
      */}
      <button
        type="button"
        className="ms-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-mail-muted hover:bg-mail-paper hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
        aria-label="Display settings"
        title="Display settings"
        onClick={() => setDisplaySettingsOpen(true)}
      >
        <Settings aria-hidden="true" className="size-4" />
      </button>

      <nav
        className="flex shrink-0 items-center gap-0.5 rounded-[9px] border border-mail-line bg-mail-paper p-[3px]"
        aria-label="Mailbox views"
      >
        {WORKSPACE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeView === tab.value}
            className={cn(
              'cursor-pointer rounded-md px-3 py-1.5 text-[13px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100 sm:px-4',
              activeView === tab.value
                ? 'bg-mail-card font-semibold text-mail-ink shadow-[0_1px_2px_rgba(28,53,87,0.08)]'
                : 'text-mail-mid hover:text-mail-ink'
            )}
            onClick={() => onViewChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <EmailDisplaySettingsDialog
        open={displaySettingsOpen}
        onOpenChange={setDisplaySettingsOpen}
      />
    </header>
  );
}

function MailboxMenuItem({
  account,
  label,
  isActive,
}: {
  account: EmailAccount;
  label: string;
  isActive: boolean;
}) {
  return (
    <DropdownMenuItem asChild>
      <Link to={`/app/email/accounts/${getEmailAccountSlug(account)}`}>
        <Mail aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {isActive && <Check aria-hidden="true" className="size-4 shrink-0 text-mail-accent" />}
      </Link>
    </DropdownMenuItem>
  );
}
