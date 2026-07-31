import { useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAccess } from '@/app/contexts/access-context';
import { canAccessQuickShortcut } from '@/modules/quick-shortcuts/constants/quick-shortcut-destinations';
import { useQuickShortcutsQuery } from '@/modules/quick-shortcuts/hooks/quick-shortcuts.hooks';
import type { QuickShortcut } from '@/modules/quick-shortcuts/schemas/quick-shortcut.schema';
import { ArrowUpRight, ChevronDown, Link2, Plus, RefreshCw, Settings2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { QuickShortcutsManagerDialog } from './quick-shortcuts-manager-dialog';

function isSelectedPath(pathname: string, href: string) {
  return pathname === href || (href !== '/app' && pathname.startsWith(`${href}/`));
}

function ShortcutLinkContent({
  shortcut,
  showNewTabIndicator,
}: {
  shortcut: QuickShortcut;
  showNewTabIndicator: boolean;
}) {
  return (
    <>
      <Link2 aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{shortcut.name}</span>
      {showNewTabIndicator ? (
        <>
          <ArrowUpRight
            data-slot="sidebar-external-indicator"
            className="ms-auto shrink-0"
            aria-hidden="true"
          />
          <span className="sr-only">(opens in a new tab)</span>
        </>
      ) : null}
    </>
  );
}

function QuickShortcutLink({ shortcut, pathname }: { shortcut: QuickShortcut; pathname: string }) {
  const href =
    shortcut.destinationType === 'INTERNAL' ? shortcut.internalPath : shortcut.externalUrl;
  if (!href) return null;

  const className =
    "relative flex h-8 w-full min-w-0 items-center gap-2 overflow-hidden rounded-md px-2 text-[13px] font-medium text-sidebar-foreground/95 outline-hidden transition-colors hover:bg-sidebar-item-hover hover:text-sidebar-foreground focus-visible:bg-sidebar-item-hover focus-visible:text-sidebar-foreground data-[selected=true]:bg-sidebar-item-active data-[selected=true]:text-sidebar-foreground data-[selected=true]:before:absolute data-[selected=true]:before:bottom-1.5 data-[selected=true]:before:left-0 data-[selected=true]:before:top-1.5 data-[selected=true]:before:w-0.5 data-[selected=true]:before:rounded-r data-[selected=true]:before:bg-brand-gold data-[selected=true]:before:content-[''] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-60";
  const selected = shortcut.destinationType === 'INTERNAL' && isSelectedPath(pathname, href);
  const content = (
    <ShortcutLinkContent shortcut={shortcut} showNewTabIndicator={shortcut.openInNewTab} />
  );

  if (shortcut.destinationType === 'INTERNAL' && !shortcut.openInNewTab) {
    return (
      <Link
        to={href}
        role="menuitem"
        data-slot="accordion-menu-link-item"
        data-selected={selected ? 'true' : undefined}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <a
      href={href}
      role="menuitem"
      data-slot="accordion-menu-link-item"
      data-selected={selected ? 'true' : undefined}
      className={className}
      target={shortcut.openInNewTab ? '_blank' : undefined}
      rel={shortcut.openInNewTab ? 'noopener noreferrer' : undefined}
    >
      {content}
    </a>
  );
}

function ShortcutMessage({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-2 px-3 py-2 text-xs text-sidebar-muted">
      <span>{children}</span>
      {action}
    </div>
  );
}

export function QuickShortcutsSidebarMenu() {
  const access = useAccess();
  const { pathname } = useLocation();
  const shortcutsQuery = useQuickShortcutsQuery();
  const [managerOpen, setManagerOpen] = useState(false);
  const visibleShortcuts = useMemo(
    () =>
      (shortcutsQuery.data ?? []).filter((shortcut) => canAccessQuickShortcut(shortcut, access)),
    [access, shortcutsQuery.data]
  );
  const isLoading = shortcutsQuery.isLoading || access.isLoading;

  return (
    <>
      <div data-sidebar-menu="group" className="space-y-1 px-2.5">
        <Collapsible
          defaultOpen
          data-slot="accordion-menu-sub"
          className="overflow-hidden rounded-md border border-sidebar-border"
        >
          <div className="flex items-center">
            <CollapsibleTrigger
              data-slot="accordion-menu-sub-trigger"
              className="group/shortcut-trigger flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 text-start text-[13px] font-medium text-sidebar-foreground outline-hidden transition-colors hover:bg-sidebar-item-hover focus-visible:bg-sidebar-item-hover"
            >
              <span className="min-w-0 flex-1 truncate">Quick Shortcuts</span>
              {visibleShortcuts.length > 0 ? (
                <span className="text-[11px] font-normal text-sidebar-muted">
                  {visibleShortcuts.length}
                </span>
              ) : null}
              <ChevronDown
                aria-hidden="true"
                data-slot="accordion-menu-sub-indicator"
                className="size-3.5 shrink-0 text-sidebar-muted transition-transform group-data-[state=open]/shortcut-trigger:-rotate-180"
              />
            </CollapsibleTrigger>

            {access.isAdmin ? (
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                size="sm"
                aria-label="Manage Quick Shortcuts"
                title="Manage Quick Shortcuts"
                className="me-1 text-sidebar-muted hover:bg-sidebar-item-hover hover:text-sidebar-foreground"
                onClick={() => setManagerOpen(true)}
              >
                <Settings2 />
              </Button>
            ) : null}
          </div>

          <CollapsibleContent
            data-slot="accordion-menu-sub-content"
            className="border-t border-sidebar-border"
          >
            <div data-slot="accordion-menu-sub-wrapper" role="menu" className="space-y-1 py-1">
              {isLoading ? (
                <div className="space-y-2 px-3 py-2" aria-label="Loading Quick Shortcuts">
                  <Skeleton className="h-6 w-full bg-sidebar-item-hover" />
                  <Skeleton className="h-6 w-4/5 bg-sidebar-item-hover" />
                </div>
              ) : shortcutsQuery.isError ? (
                <ShortcutMessage
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      aria-label="Retry loading Quick Shortcuts"
                      className="text-sidebar-muted hover:bg-sidebar-item-hover hover:text-sidebar-foreground"
                      onClick={() => void shortcutsQuery.refetch()}
                    >
                      <RefreshCw />
                    </Button>
                  }
                >
                  Shortcuts unavailable
                </ShortcutMessage>
              ) : visibleShortcuts.length === 0 ? (
                <ShortcutMessage
                  action={
                    access.isAdmin ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-slot="quick-shortcut-empty-action"
                        className="text-sidebar-foreground hover:bg-sidebar-item-hover hover:text-sidebar-foreground focus-visible:bg-sidebar-item-hover focus-visible:text-sidebar-foreground"
                        onClick={() => setManagerOpen(true)}
                      >
                        <Plus />
                        Add
                      </Button>
                    ) : undefined
                  }
                >
                  No shortcuts available
                </ShortcutMessage>
              ) : (
                visibleShortcuts.map((shortcut) => (
                  <QuickShortcutLink key={shortcut.id} shortcut={shortcut} pathname={pathname} />
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {access.isAdmin ? (
        <QuickShortcutsManagerDialog
          open={managerOpen}
          onOpenChange={setManagerOpen}
          access={access}
        />
      ) : null}
    </>
  );
}
