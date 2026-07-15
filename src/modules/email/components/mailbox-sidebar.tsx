import { useState, type PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import type { ConnectedEmailFolder } from '@/modules/email/api';
import {
  Archive,
  ChevronDown,
  ChevronsLeft,
  Edit3,
  Folder,
  FolderPlus,
  Inbox,
  LogOut,
  Menu,
  MoreHorizontal,
  NotebookText,
  Plus,
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
  folder: string;
  label: string;
  count?: number | string;
  icon: typeof Inbox;
};

type MailboxFolderGroup = {
  key: string;
  label: string;
  folders: MailboxFolder[];
};

const favouriteFolders: MailboxFolder[] = [
  { key: 'fav-inbox', folder: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'fav-sent', folder: 'sent', label: 'Sent Items', icon: Send },
  { key: 'fav-drafts', folder: 'drafts', label: 'Drafts', icon: Edit3 },
  { key: 'fav-deleted', folder: 'deleted', label: 'Deleted Items', icon: Trash2 },
];

const accountFolders: MailboxFolder[] = [
  { key: 'inbox', folder: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'drafts', folder: 'drafts', label: 'Drafts', icon: Edit3 },
  { key: 'sent', folder: 'sent', label: 'Sent Items', icon: Send },
  { key: 'deleted', folder: 'deleted', label: 'Deleted Items', icon: Trash2 },
  { key: 'junk', folder: 'junk', label: 'Junk Email', icon: Folder },
  { key: 'notes', folder: 'notes', label: 'Notes', icon: NotebookText },
  { key: 'archive', folder: 'archive', label: 'Archive', icon: Archive },
  { key: 'history', folder: 'history', label: 'Conversation History', icon: Folder },
  { key: 'rss', folder: 'rss', label: 'RSS Feeds', icon: Folder },
  { key: 'search', folder: 'search', label: 'Search Folders', icon: Search },
];

interface MailboxSidebarProps {
  mailboxAddress: string;
  selectedFolder: string;
  folderCounts: Partial<Record<string, number | string>>;
  folders?: ConnectedEmailFolder[];
  collapsed?: boolean;
  isAddingAccount?: boolean;
  isCreatingFolder?: boolean;
  isDisconnectingAccount?: boolean;
  onSelectFolder: (folder: string) => void;
  onCompose: () => void;
  onCreateFolder?: (name: string) => void;
  onDisconnectAccount?: () => void;
  onAddAccount?: (provider: 'gmail' | 'outlook') => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function MailboxSidebar({
  mailboxAddress,
  selectedFolder,
  folderCounts,
  folders,
  collapsed: controlledCollapsed,
  isAddingAccount = false,
  isCreatingFolder = false,
  isDisconnectingAccount = false,
  onSelectFolder,
  onCompose,
  onCreateFolder,
  onDisconnectAccount,
  onAddAccount,
  onCollapsedChange,
}: MailboxSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    favourites: true,
    account: true,
  });
  const [isResizing, setIsResizing] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;

  const setCollapsed = (nextCollapsed: boolean | ((current: boolean) => boolean)) => {
    const nextValue =
      typeof nextCollapsed === 'function' ? nextCollapsed(collapsed) : nextCollapsed;
    setInternalCollapsed(nextValue);
    onCollapsedChange?.(nextValue);
  };

  const providerFolders = folders?.length
    ? folders.map<MailboxFolder>((folder) => ({
        key: folder.id,
        folder: folder.id,
        label: folder.name,
        count: formatFolderCount(folder.totalCount),
        icon: getProviderFolderIcon(folder),
      }))
    : null;

  const folderGroups: MailboxFolderGroup[] = [
    {
      key: 'favourites',
      label: 'Favourites',
      folders: favouriteFolders.map((folder) => ({
        ...folder,
        count: getFolderCount(folder.folder, folderCounts),
      })),
    },
    {
      key: 'account',
      label: mailboxAddress,
      folders:
        providerFolders ??
        accountFolders.map((folder) => ({
          ...folder,
          count: getFolderCount(folder.folder, folderCounts),
        })),
    },
  ];

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    onCreateFolder?.(name);
    setNewFolderName('');
    setCreateFolderOpen(false);
  };

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
          <Button
            type="button"
            size="sm"
            className="ml-auto w-28 justify-center"
            onClick={onCompose}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Edit3 aria-hidden="true" className="size-4" />
              <span>New email</span>
            </span>
          </Button>
        )}
      </div>

      <div className="kt-scrollable-y-auto min-h-0 flex-1 px-2 py-3">
        {folderGroups.map((group) => (
          <div key={group.key} className={cn(collapsed ? 'mb-6' : 'mb-4', 'last:mb-0')}>
            {!collapsed && (
              <div className="mb-1 flex h-8 items-center gap-1">
                <button
                  type="button"
                  className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
                  aria-expanded={openGroups[group.key]}
                  onClick={() => toggleGroup(group.key)}
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150',
                      !openGroups[group.key] && '-rotate-90'
                    )}
                  />
                  <span className="truncate">{group.label}</span>
                </button>

                {group.key === 'account' && (onCreateFolder || onDisconnectAccount) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring/50"
                        aria-label={`Folder actions for ${mailboxAddress}`}
                      >
                        <MoreHorizontal aria-hidden="true" className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-44 p-1 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                    >
                      {onCreateFolder && (
                        <DropdownMenuItem
                          className="h-8 gap-2 rounded-sm px-2 text-xs"
                          onClick={() => setCreateFolderOpen(true)}
                        >
                          <FolderPlus aria-hidden="true" className="size-3.5" />
                          Create new folder
                        </DropdownMenuItem>
                      )}
                      {onCreateFolder && onDisconnectAccount && <DropdownMenuSeparator />}
                      {onDisconnectAccount && (
                        <DropdownMenuItem
                          className="h-8 gap-2 rounded-sm px-2 text-xs text-destructive focus:text-destructive"
                          disabled={isDisconnectingAccount}
                          onClick={() => setDisconnectConfirmOpen(true)}
                        >
                          <LogOut aria-hidden="true" className="size-3.5" />
                          Disconnect account
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}

            {(collapsed || openGroups[group.key]) && (
              <div className={cn('space-y-1', !collapsed && 'pl-7')}>
                {group.folders.map((folder) => (
                  <MailboxFolderButton
                    key={folder.key}
                    folder={folder}
                    collapsed={collapsed}
                    selected={folder.folder === selectedFolder}
                    onSelect={() => onSelectFolder(folder.folder)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!collapsed && (
        <div className="shrink-0 px-2 pb-4 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm font-semibold text-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:transition-colors motion-safe:duration-150"
                disabled={isAddingAccount}
              >
                <Plus aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate">Add account</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => onAddAccount?.('gmail')}>Gmail</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddAccount?.('outlook')}>Outlook</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <label htmlFor="email-new-folder" className="sr-only">
              Folder name
            </label>
            <Input
              id="email-new-folder"
              value={newFolderName}
              placeholder="Folder name"
              autoFocus
              disabled={isCreatingFolder}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCreateFolder();
              }}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={isCreatingFolder}
              onClick={() => setCreateFolderOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!newFolderName.trim() || isCreatingFolder}
              onClick={handleCreateFolder}
            >
              Create folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disconnectConfirmOpen} onOpenChange={setDisconnectConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Disconnect account</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              This removes {mailboxAddress} from Elli and stops future sync for this mailbox.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={isDisconnectingAccount}
              onClick={() => setDisconnectConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDisconnectingAccount}
              onClick={() => {
                onDisconnectAccount?.();
                setDisconnectConfirmOpen(false);
              }}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function MailboxFolderButton({
  folder,
  collapsed,
  selected,
  onSelect,
}: {
  folder: MailboxFolder;
  collapsed: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = folder.icon;

  return (
    <button
      type="button"
      className={cn(
        'group relative flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm text-muted-foreground',
        'hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'motion-safe:transition-colors motion-safe:duration-150',
        selected && 'bg-primary/10 font-semibold text-primary hover:bg-primary/15',
        collapsed && 'justify-center px-0'
      )}
      aria-current={selected ? 'page' : undefined}
      onClick={onSelect}
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

function getFolderCount(folder: string, folderCounts: Partial<Record<string, number | string>>) {
  const count = folderCounts[folder];
  if (typeof count === 'string') return count;
  return formatFolderCount(count);
}

function formatFolderCount(count: number | null | undefined) {
  if (!count || count <= 0) return undefined;
  if (count >= 100) return '100+';
  return count;
}

function getProviderFolderIcon(folder: ConnectedEmailFolder) {
  const key = folder.key?.toLowerCase();
  const name = folder.name.toLowerCase();
  if (key === 'inbox' || name.includes('inbox')) return Inbox;
  if (key === 'sent' || name.includes('sent')) return Send;
  if (key === 'drafts' || name.includes('draft')) return Edit3;
  if (key === 'deleted' || name.includes('delete') || name.includes('trash')) return Trash2;
  if (key === 'archive' || name.includes('archive')) return Archive;
  return Folder;
}
