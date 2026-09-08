import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import type {
  ConnectedEmailFolder,
  ConnectedEmailTag,
  EmailReferenceProject,
} from '@/modules/email/api';
import { EMAIL_FOLDERS } from '@/modules/email/constants/email-folders';
import {
  addRecentEmailSearch,
  clearRecentEmailSearches,
  useRecentEmailSearches,
} from '@/modules/email/hooks/use-recent-email-searches';
import {
  ChevronDown,
  Clock,
  FolderPlus,
  Inbox,
  Plus,
  RefreshCcw,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

export type EmailListFilter = 'all' | 'unread' | 'flagged' | 'attachments' | 'other';

/**
 * Thread state filter — independent of the "show messages" filter.
 * Unclassified threads default to "open" (matches how the row status pill
 * renders), so the "open" filter includes them. "open_our_court" and
 * "open_their_court" narrow further to one side of an open thread, matching
 * the same two states `EmailThreadState` already carries elsewhere.
 */
export type EmailStatusFilter = 'all' | 'open' | 'open_our_court' | 'open_their_court' | 'closed';

interface EmailMailToolbarProps {
  selectedFolder: string;
  folders?: ConnectedEmailFolder[];
  filter: EmailListFilter;
  statusFilter?: EmailStatusFilter;
  search: string;
  projects?: EmailReferenceProject[];
  categoryTags?: ConnectedEmailTag[];
  selectedProjectId?: string | null;
  selectedCategoryTagId?: string | null;
  isRefreshing?: boolean;
  isCreatingFolder?: boolean;
  composeDisabled?: boolean;
  onSelectFolder?: (folder: string) => void;
  onFilterChange: (filter: EmailListFilter) => void;
  onStatusFilterChange?: (statusFilter: EmailStatusFilter) => void;
  onSearchChange: (search: string) => void;
  onProjectChange?: (projectId: string | null) => void;
  onCategoryTagChange?: (tagId: string | null) => void;
  onRefresh?: () => void;
  onCompose?: () => void;
  onCreateFolder?: (name: string) => void;
  /**
   * Present when the current folder can be emptied wholesale (Deleted Items /
   * Junk). Clicking triggers a destructive confirm in the caller.
   */
  onEmptyFolder?: () => void;
  emptyFolderDisabled?: boolean;
}

export function EmailMailToolbar({
  selectedFolder,
  folders = [],
  filter,
  statusFilter = 'all',
  search,
  projects = [],
  categoryTags = [],
  selectedProjectId = null,
  selectedCategoryTagId = null,
  isRefreshing = false,
  isCreatingFolder = false,
  composeDisabled = false,
  onSelectFolder,
  onFilterChange,
  onStatusFilterChange,
  onSearchChange,
  onProjectChange,
  onCategoryTagChange,
  onRefresh,
  onCompose,
  onCreateFolder,
  onEmptyFolder,
  emptyFolderDisabled = false,
}: EmailMailToolbarProps) {
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const recentSearches = useRecentEmailSearches();
  const showRecentSearches = searchFocused && !search.trim() && recentSearches.length > 0;

  const commitSearch = (value: string) => {
    onSearchChange(value);
    addRecentEmailSearch(value);
  };
  const inboxFolder = folders.find((folder) => folder.key === 'inbox');
  const otherFolders = folders.filter((folder) => folder.key !== 'inbox');
  const selectedFolderRecord = folders.find(
    (folder) => folder.id === selectedFolder || folder.key === selectedFolder
  );
  const selectedFolderKey = selectedFolderRecord?.key ?? selectedFolder;
  const isOtherView = filter === 'other';
  const isInboxSelected = !isOtherView && selectedFolderKey === 'inbox';
  const selectedFolderLabel = isOtherView
    ? 'Other'
    : (selectedFolderRecord?.name ??
      EMAIL_FOLDERS.find((folder) => folder.key === selectedFolder)?.label ??
      'Inbox');
  const selectedProject =
    projects.find((project) => project.entityId === selectedProjectId) ?? null;
  const selectedCategoryTag =
    categoryTags.find((tag) => tag.id === selectedCategoryTagId) ??
    categoryTags.find((tag) => tag.providerId === selectedCategoryTagId) ??
    null;
  const filterLabels: Record<EmailListFilter, string> = {
    all: 'All emails',
    unread: 'Unread',
    flagged: 'Flagged',
    attachments: 'Attachments',
    other: 'Other',
  };
  const statusLabels: Record<EmailStatusFilter, string> = {
    all: 'Any status',
    open: 'Open',
    open_our_court: 'Our court',
    open_their_court: 'Their court',
    closed: 'Closed',
  };
  const filterLabelParts: string[] = [];
  if (isOtherView) {
    if (selectedCategoryTag) filterLabelParts.push(selectedCategoryTag.name);
  } else if (filter !== 'all') {
    filterLabelParts.push(filterLabels[filter]);
  }
  if (!isOtherView && statusFilter !== 'all') {
    filterLabelParts.push(statusLabels[statusFilter]);
  }
  const filterLabel =
    filterLabelParts.length > 0 ? `Filters · ${filterLabelParts.join(' · ')}` : 'Filters';

  const openOtherCategory = () => {
    onSelectFolder?.(inboxFolder?.id ?? 'inbox');
    onFilterChange('other');
    onCategoryTagChange?.(null);
  };

  const submitFolder = () => {
    const name = folderName.trim();
    if (!name || !onCreateFolder) return;
    onCreateFolder(name);
    setFolderName('');
    setCreateFolderOpen(false);
  };

  return (
    <>
      <div className="shrink-0 border-b border-border bg-background px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                className={cn(
                  'h-10 min-h-10 gap-1.5 px-3.5 sm:h-9 sm:min-h-9 motion-safe:transition-colors motion-safe:duration-100',
                  selectedProject && 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
                disabled={!onProjectChange}
              >
                <span className="max-w-40 truncate">
                  {selectedProject?.label ?? 'Project emails'}
                </span>
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={selectedProjectId ?? 'all'}
                onValueChange={(value) => onProjectChange?.(value === 'all' ? null : value)}
              >
                <DropdownMenuLabel>Filter by project</DropdownMenuLabel>
                <DropdownMenuRadioItem value="all">All emails</DropdownMenuRadioItem>
                {projects.length > 0 && <DropdownMenuSeparator />}
                {projects.length === 0 ? (
                  <DropdownMenuItem disabled>No project mail yet</DropdownMenuItem>
                ) : (
                  projects.map((project) => (
                    <DropdownMenuRadioItem key={project.entityId} value={project.entityId}>
                      <span className="min-w-0 flex-1 truncate">{project.label}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {project.mailCount}
                      </span>
                    </DropdownMenuRadioItem>
                  ))
                )}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-10 min-h-10 gap-1.5 px-3.5 sm:h-9 sm:min-h-9"
                disabled={!onSelectFolder}
              >
                {isOtherView ? (
                  <Tag aria-hidden="true" className="size-4" />
                ) : (
                  isInboxSelected && <Inbox aria-hidden="true" className="size-4" />
                )}
                <span className="max-w-36 truncate">{selectedFolderLabel}</span>
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-64 overflow-y-auto">
              <DropdownMenuLabel>Go to</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onSelectFolder?.(inboxFolder?.id ?? 'inbox')}>
                <Inbox aria-hidden="true" />
                Inbox
              </DropdownMenuItem>
              {/*
                Two distinct sections below: "Categories" is a filter view
                ("Other" for uncategorised threads), "Folders" is the mail
                provider's real folder tree (Drafts, Sent Items, Deleted Items,
                Junk Email, Archive, Conversation History, custom folders…).
                Keeping them apart avoids overloading the word "Other" — it's a
                category, not a folder — and reads cleanly across Outlook,
                Gmail, and Zoho.
              */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              <DropdownMenuItem onClick={openOtherCategory}>
                <span className="min-w-0 flex-1 truncate">Other</span>
              </DropdownMenuItem>
              {otherFolders.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Folders</DropdownMenuLabel>
                  {otherFolders.map((folder) => (
                    <DropdownMenuItem key={folder.id} onClick={() => onSelectFolder?.(folder.id)}>
                      <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                      {folder.unreadCount > 0 && (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {folder.unreadCount}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {onCreateFolder && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
                    <FolderPlus aria-hidden="true" />
                    Create folder
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 min-h-10 gap-1.5 px-3.5 sm:h-9 sm:min-h-9"
              >
                <span className="capitalize">{filterLabel}</span>
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {isOtherView ? (
                <DropdownMenuRadioGroup
                  value={selectedCategoryTagId ?? 'all'}
                  onValueChange={(value) => onCategoryTagChange?.(value === 'all' ? null : value)}
                >
                  <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
                  <DropdownMenuRadioItem value="all">All Other mail</DropdownMenuRadioItem>
                  {categoryTags.length > 0 && <DropdownMenuSeparator />}
                  {categoryTags.length === 0 ? (
                    <DropdownMenuItem disabled>No assigned categories</DropdownMenuItem>
                  ) : (
                    categoryTags.map((tag) => (
                      <DropdownMenuRadioItem key={tag.id} value={tag.id}>
                        <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                      </DropdownMenuRadioItem>
                    ))
                  )}
                </DropdownMenuRadioGroup>
              ) : (
                <>
                  <DropdownMenuLabel>Show messages</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={filter}
                    onValueChange={(value) => onFilterChange(value as EmailListFilter)}
                  >
                    <DropdownMenuRadioItem value="all">All emails</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="unread">Unread only</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="flagged">Flagged</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="attachments">
                      With attachments
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  {onStatusFilterChange && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Thread status</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={statusFilter}
                        onValueChange={(value) => onStatusFilterChange(value as EmailStatusFilter)}
                      >
                        <DropdownMenuRadioItem value="all">Any</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="open">Open</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="open_our_court">Our court</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="open_their_court">
                          Their court
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="closed">Closed</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative min-w-52 flex-1 sm:max-w-sm">
            <label htmlFor="email-workspace-search" className="sr-only">
              Search mail
            </label>
            <InputWrapper variant="sm" className="h-10 gap-2 bg-background px-3 sm:h-9">
              <Search aria-hidden="true" className="size-4" />
              <Input
                id="email-workspace-search"
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={search}
                placeholder="Search mail…"
                autoComplete="off"
                onChange={(event) => onSearchChange(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && search.trim()) addRecentEmailSearch(search);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring sm:size-9 motion-safe:transition-colors motion-safe:duration-100"
                  aria-label="Clear email search"
                  onClick={() => onSearchChange('')}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </InputWrapper>

            {showRecentSearches && (
              <ul
                role="listbox"
                aria-label="Recent searches"
                className="absolute left-0 top-full z-50 mt-1 w-full min-w-64 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md"
              >
                <li className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Recent searches
                  </span>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      clearRecentEmailSearches();
                    }}
                  >
                    Clear
                  </button>
                </li>
                {recentSearches.map((entry) => (
                  <li key={entry} role="option" aria-selected={false}>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                      // onMouseDown so the field's blur never fires before the pick lands.
                      onMouseDown={(event) => {
                        event.preventDefault();
                        commitSearch(entry);
                      }}
                    >
                      <Clock aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate">{entry}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {onRefresh && (
            <Button
              type="button"
              variant="ghost"
              mode="icon"
              size="icon"
              className="size-10 sm:size-9"
              disabled={isRefreshing}
              aria-busy={isRefreshing}
              aria-label="Refresh emails"
              onClick={onRefresh}
            >
              <RefreshCcw
                aria-hidden="true"
                className={cn('size-4', isRefreshing && 'motion-safe:animate-spin')}
              />
            </Button>
          )}

          {onEmptyFolder && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 min-h-10 gap-1.5 text-destructive hover:text-destructive sm:h-9 sm:min-h-9"
              disabled={emptyFolderDisabled}
              aria-label="Empty folder"
              title="Permanently delete every message in this folder"
              onClick={onEmptyFolder}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              Empty
            </Button>
          )}

          <div className="ml-auto flex items-center">
            <Button
              type="button"
              size="sm"
              className="h-10 min-h-10 w-20 justify-between gap-0 pl-2 pr-3 active:translate-y-px sm:h-9 sm:min-h-9"
              disabled={composeDisabled || !onCompose}
              aria-keyshortcuts="Control+N Meta+N"
              title="New email (Ctrl/Command+N)"
              onClick={onCompose}
            >
              <Plus aria-hidden="true" className="size-3.5" />
              New
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create mail folder</DialogTitle>
            <DialogDescription>Add a folder to this connected mailbox.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitFolder();
            }}
          >
            <label htmlFor="new-email-folder" className="text-sm font-medium text-foreground">
              Folder name
            </label>
            <Input
              id="new-email-folder"
              value={folderName}
              className="mt-2"
              autoComplete="off"
              onChange={(event) => setFolderName(event.target.value)}
            />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setCreateFolderOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!folderName.trim() || isCreatingFolder}
                aria-busy={isCreatingFolder}
              >
                {isCreatingFolder ? 'Creating…' : 'Create folder'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
