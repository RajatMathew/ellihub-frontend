import { useState, type PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import {
  Archive,
  ChevronDown,
  ChevronsLeft,
  Edit3,
  Folder,
  Inbox,
  Menu,
  NotebookText,
  Search,
  Send,
  Trash2,
} from 'lucide-react';

const COLLAPSED_WIDTH = 60;
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 240;
const MAX_WIDTH = 336;

type MailboxFolder = {
  key: string;
  label: string;
  count?: number | string;
  icon: typeof Inbox;
  selected?: boolean;
};

type MailboxFolderGroup = {
  key: string;
  label: string;
  folders: MailboxFolder[];
};

const favouriteFolders: MailboxFolder[] = [
  { key: 'fav-inbox', label: 'Inbox', count: 139, icon: Inbox },
  { key: 'fav-sent', label: 'Sent Items', icon: Send },
  { key: 'fav-drafts', label: 'Drafts', count: '[7]', icon: Edit3 },
  { key: 'fav-deleted', label: 'Deleted Items', count: 9, icon: Trash2 },
];

const accountFolders: MailboxFolder[] = [
  { key: 'inbox', label: 'Inbox', count: 139, icon: Inbox, selected: true },
  { key: 'drafts', label: 'Drafts', count: '[7]', icon: Edit3 },
  { key: 'sent', label: 'Sent Items', icon: Send },
  { key: 'deleted', label: 'Deleted Items', count: 9, icon: Trash2 },
  { key: 'junk', label: 'Junk Email', icon: Folder },
  { key: 'notes', label: 'Notes', icon: NotebookText },
  { key: 'archive', label: 'Archive', icon: Archive },
  { key: 'history', label: 'Conversation History', icon: Folder },
  { key: 'rss', label: 'RSS Feeds', icon: Folder },
  { key: 'search', label: 'Search Folders', icon: Search },
];

interface MailboxSidebarProps {
  mailboxAddress: string;
}

export function MailboxSidebar({ mailboxAddress }: MailboxSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    favourites: true,
    account: true,
  });
  const [isResizing, setIsResizing] = useState(false);

  const folderGroups: MailboxFolderGroup[] = [
    {
      key: 'favourites',
      label: 'Favourites',
      folders: favouriteFolders,
    },
    {
      key: 'account',
      label: mailboxAddress,
      folders: accountFolders,
    },
  ];

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (collapsed) setCollapsed(false);

    const startX = event.clientX;
    const startWidth = width;
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX)
      );
      setWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  };

  return (
    <aside
      className={cn(
        'relative flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/20',
        !isResizing &&
          'motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out',
        'motion-reduce:transition-none',
        collapsed && 'w-15'
      )}
      style={!collapsed ? { width } : { width: COLLAPSED_WIDTH }}
      aria-label="Mailbox folders"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3">
        <Button
          type="button"
          variant="ghost"
          mode="icon"
          size="icon"
          aria-label={collapsed ? 'Expand mailbox sidebar' : 'Collapse mailbox sidebar'}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <Menu aria-hidden="true" /> : <ChevronsLeft aria-hidden="true" />}
        </Button>

        {!collapsed && (
          <Button type="button" size="sm" className="ml-auto w-28 justify-center">
            <span className="flex min-w-0 items-center gap-2">
              <Edit3 aria-hidden="true" className="size-4" />
              <span>New email</span>
            </span>
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-2 py-3">
        {folderGroups.map((group) => (
          <div key={group.key} className={cn(collapsed ? 'mb-6' : 'mb-4', 'last:mb-0')}>
            {!collapsed && (
              <button
                type="button"
                className="mb-1 flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
                aria-expanded={openGroups[group.key]}
                onClick={() => toggleGroup(group.key)}
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'size-4 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150',
                    !openGroups[group.key] && '-rotate-90'
                  )}
                />
                <span className="truncate">{group.label}</span>
              </button>
            )}

            {(collapsed || openGroups[group.key]) && (
              <div className={cn('space-y-1', !collapsed && 'pl-7')}>
                {group.folders.map((folder) => (
                  <MailboxFolderButton key={folder.key} folder={folder} collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!collapsed && (
        <button
          type="button"
          className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none border-r border-transparent hover:border-primary/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
          aria-label="Resize mailbox sidebar"
          onPointerDown={handleResizeStart}
        />
      )}
    </aside>
  );
}

function MailboxFolderButton({ folder, collapsed }: { folder: MailboxFolder; collapsed: boolean }) {
  const Icon = folder.icon;

  return (
    <button
      type="button"
      className={cn(
        'group relative flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm text-muted-foreground',
        'hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'motion-safe:transition-colors motion-safe:duration-150',
        folder.selected && 'bg-primary/10 font-semibold text-primary hover:bg-primary/15',
        collapsed && 'justify-center px-0'
      )}
      aria-current={folder.selected ? 'page' : undefined}
      title={collapsed ? folder.label : undefined}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{folder.label}</span>
          {folder.count !== undefined && (
            <span className="shrink-0 text-xs font-semibold text-inherit opacity-80">
              {folder.count}
            </span>
          )}
        </>
      )}
    </button>
  );
}
