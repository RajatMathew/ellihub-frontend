import { useCallback, useState, type ReactNode } from 'react';

import { forceCheckForUpdate } from '@/core/pwa/usePwaUpdater';
import { QuickBooksReferenceSyncDialog } from '@/modules/integrations/components/quickbooks-reference-sync-dialog';
import { useQuickBooksReferenceSyncStatusQuery } from '@/modules/integrations/hooks/quickbooks.hooks';
import { FieldwireSyncDialog } from '@/modules/synchronization/components/fieldwire-sync-dialog';
import { useFieldwireSyncStatusQuery } from '@/modules/synchronization/hooks/synchronization.hooks';
import {
  BetweenHorizontalStart,
  Bug,
  Check,
  Coffee,
  FileText,
  HistoryIcon,
  Palette,
  RefreshCcw,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { debugForceUpdate, useSession } from '@app/api';
import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { useAccess } from '@app/contexts/access-context';
import {
  DEFAULT_THEME,
  isAppTheme,
  THEME_GROUPS,
  THEME_OPTIONS,
  THEME_SWITCHER_ENABLED,
} from '@app/theme/theme-registry';

function formatSyncLabel(value: string | null | undefined, isLoading: boolean) {
  if (isLoading) return 'Loading sync status...';
  if (!value) return 'Never synced';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Last sync unknown';

  return `Last global sync: ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`;
}

function formatQuickBooksSyncLabel({
  connected,
  isError,
  isLoading,
  lastSyncedAt,
}: {
  connected: boolean | undefined;
  isError: boolean;
  isLoading: boolean;
  lastSyncedAt: string | null | undefined;
}) {
  if (isLoading) return 'Loading sync status...';
  if (isError) return 'Unable to load sync status';
  if (connected === false) return 'QuickBooks not connected';

  return formatSyncLabel(lastSyncedAt, false);
}

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const navigate = useNavigate();
  const [fieldwireSyncOpen, setFieldwireSyncOpen] = useState(false);
  const [quickBooksSyncOpen, setQuickBooksSyncOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const activeTheme = isAppTheme(theme) ? theme : DEFAULT_THEME;

  const handleThemeChange = useCallback(
    (value: string) => {
      if (!isAppTheme(value)) return;
      setTheme(value);
    },
    [setTheme]
  );
  const { data } = useSession();
  const { isAdmin, can } = useAccess();
  const canSyncFieldwire = can('primeChangeOrder', 'sync');
  const canSyncQuickBooks = can('integration', 'sync');
  const canManageTemplates = can('template', 'read');
  const canManageIntegrations = can('integration', 'read');
  const fieldwireSyncStatusQuery = useFieldwireSyncStatusQuery(canSyncFieldwire);
  const quickBooksSyncStatusQuery = useQuickBooksReferenceSyncStatusQuery(canSyncQuickBooks);
  const fieldwireSyncLabel = formatSyncLabel(
    fieldwireSyncStatusQuery.data?.lastSyncedAt,
    fieldwireSyncStatusQuery.isLoading
  );
  const quickBooksSyncLabel = formatQuickBooksSyncLabel({
    connected: quickBooksSyncStatusQuery.data?.connected,
    isError: quickBooksSyncStatusQuery.isError,
    isLoading: quickBooksSyncStatusQuery.isLoading,
    lastSyncedAt: quickBooksSyncStatusQuery.data?.lastSyncedAt,
  });
  const showSynchronization = canSyncFieldwire || canSyncQuickBooks;

  async function handleCheckUpdate() {
    const hasUpdate = await forceCheckForUpdate();

    if (!hasUpdate) {
      toast(` Your app is up to date! v${__APP_VERSION__}`, {
        icon: <Check className="size-4 text-success" />,
      });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 shadow-2xl" side="bottom" align="end">
          {/* Header */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              {/* <img
                className="size-10 rounded-full border-2 border-green-500"
                src={userImage}
                alt="User avatar"
              /> */}
              <div className="flex flex-col">
                <Link
                  to="/app/profile"
                  className="text-sm text-mono hover:text-primary font-semibold"
                >
                  {data?.user?.name}
                </Link>
                <a
                  href={`mailto:${data?.user?.email}`}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  {data?.user?.email}
                </a>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to="/app/profile" className="flex items-center gap-2">
              <UserCircle />
              My Profile
            </Link>
          </DropdownMenuItem>

          {/* My Account Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <Settings />
              Settings
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {/* <DropdownMenuItem asChild>
                <Link to="#" className="flex items-center gap-2">
                  <Coffee />
                  Get Started
                </Link>
              </DropdownMenuItem> */}
              <DropdownMenuItem asChild>
                <Link to="/app/profile" className="flex items-center gap-2">
                  <FileText />
                  My Profile
                </Link>
              </DropdownMenuItem>
              {/* <DropdownMenuItem asChild>
                <Link to="#" className="flex items-center gap-2">
                  <CreditCard />
                  Billing
                </Link>
              </DropdownMenuItem> */}
              {/* <DropdownMenuItem asChild>
                <Link to="#" className="flex items-center gap-2">
                  <Shield />
                  Security
                </Link>
              </DropdownMenuItem> */}
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/app/settings/members" className="flex items-center gap-2">
                    <Users />
                    Members & Roles
                  </Link>
                </DropdownMenuItem>
              )}
              {canManageTemplates && (
                <DropdownMenuItem asChild>
                  <Link to="/app/settings/templates" className="flex items-center gap-2">
                    <FileText />
                    Templates
                  </Link>
                </DropdownMenuItem>
              )}
              {canManageIntegrations && (
                <DropdownMenuItem asChild>
                  <Link to="/app/settings/integrations" className="flex items-center gap-2">
                    <BetweenHorizontalStart />
                    Integrations
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* <DropdownMenuItem asChild>
            <Link to="/changes-log" className="flex items-center gap-2">
              <HistoryIcon />
              Changes Log
            </Link>
          </DropdownMenuItem> */}

          {showSynchronization && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <RefreshCcw />
                Synchronization
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {canSyncFieldwire && (
                  <DropdownMenuItem
                    className="items-start gap-2"
                    onSelect={(event) => {
                      event.preventDefault();
                      setFieldwireSyncOpen(true);
                    }}
                  >
                    <RefreshCcw className="mt-0.5 size-4" />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm">Fieldwire</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {fieldwireSyncLabel}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )}
                {canSyncQuickBooks && (
                  <DropdownMenuItem
                    className="items-start gap-2"
                    onSelect={(event) => {
                      event.preventDefault();
                      setQuickBooksSyncOpen(true);
                    }}
                  >
                    <RefreshCcw className="mt-0.5 size-4" />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm">QuickBooks</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {quickBooksSyncLabel}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {/* <DropdownMenuItem asChild>
            <Link to="/help" className="flex items-center gap-2">
              <SquareCode />
              Help Center
            </Link>
          </DropdownMenuItem> */}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <Bug /> Developer Settings
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent className="w-48">
              <DropdownMenuItem asChild>
                <Link to="" className="flex items-center gap-2">
                  <Coffee />
                  Logger
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="#"
                  onClick={() => window.toggleDevtools()}
                  className="flex items-center gap-2"
                >
                  <FileText />
                  Query Devtools
                </a>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <Bug /> Debug
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48" slot="content" avoidCollisions={true}>
                  <DropdownMenuItem asChild>
                    <a href="#" onClick={handleCheckUpdate} className="flex items-center gap-2">
                      <HistoryIcon />
                      Check for Updates
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('pwa-update-available'));
                      }}
                    >
                      <Bug />
                      Fake PWA Update
                    </button>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <button
                      onClick={() => {
                        debugForceUpdate();
                      }}
                      className="flex items-center gap-2"
                    >
                      <Bug />
                      Force Update(API)
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Language Submenu with Radio Group */}
          {/* <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2 *:data-[slot=dropdown-menu-sub-trigger-indicator]:hidden hover:**:data-[slot=badge]:border-input data-[state=open]:**:data-[slot=badge]:border-input">
              <Globe />
              <span className="flex items-center justify-between gap-2 grow relative">
                Language
                <Badge variant="outline" className="absolute end-0 top-1/2 -translate-y-1/2">
                  {currenLanguage.label}
                  <img
                    src={currenLanguage.flag}
                    className="w-3.5 h-3.5 rounded-full"
                    alt={currenLanguage.label}
                  />
                </Badge>
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              <DropdownMenuRadioGroup value={currenLanguage.code}>
                {I18N_LANGUAGES.map((item) => (
                  <DropdownMenuRadioItem
                    key={item.code}
                    value={item.code}
                    className="flex items-center gap-2"
                  >
                    <img src={item.flag} className="w-4 h-4 rounded-full" alt={item.label} />
                    <span>{item.label}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub> */}

          <DropdownMenuSeparator />
          {THEME_SWITCHER_ENABLED && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Palette />
                <span className="flex grow items-center justify-between gap-2">
                  Theme
                  <span className="text-xs capitalize text-muted-foreground">{activeTheme}</span>
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {THEME_GROUPS.map((group, groupIndex) => (
                  <div key={group.value}>
                    {groupIndex > 0 && <div className="my-1 border-b" />}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </div>
                    <DropdownMenuRadioGroup value={activeTheme} onValueChange={handleThemeChange}>
                      {THEME_OPTIONS.filter((option) => option.group === group.value).map(
                        (option) => (
                          <DropdownMenuRadioItem
                            key={option.value}
                            value={option.value}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <span>{option.label}</span>
                          </DropdownMenuRadioItem>
                        )
                      )}
                    </DropdownMenuRadioGroup>
                  </div>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <div className="p-2 mt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                navigate('/sign-out');
              }}
            >
              Sign Out
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {canSyncFieldwire && (
        <FieldwireSyncDialog open={fieldwireSyncOpen} onOpenChange={setFieldwireSyncOpen} />
      )}
      {canSyncQuickBooks && (
        <QuickBooksReferenceSyncDialog
          open={quickBooksSyncOpen}
          onOpenChange={setQuickBooksSyncOpen}
        />
      )}
    </>
  );
}
