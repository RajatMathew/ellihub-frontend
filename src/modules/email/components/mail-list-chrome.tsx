import { useEffect, useRef, useState } from 'react';

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
import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import type {
  ConnectedEmailFolder,
  ConnectedEmailTag,
  EmailReferenceProject,
} from '@/modules/email/api';
import type { EmailListFilter, EmailStatusFilter } from '@/modules/email/constants/email-filters';
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
  ListFilter,
  Plus,
  RefreshCcw,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';

const FILTER_LABELS: Record<EmailListFilter, string> = {
  all: 'All emails',
  unread: 'Unread',
  flagged: 'Flagged',
  attachments: 'Attachments',
  other: 'Other',
};

const STATUS_LABELS: Record<EmailStatusFilter, string> = {
  all: 'Any status',
  open: 'Open',
  open_our_court: 'Our court',
  open_their_court: 'Their court',
  closed: 'Closed',
};

interface MailListChromeProps {
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
  onEmptyFolder?: () => void;
  emptyFolderDisabled?: boolean;
}

/**
 * Everything above the conversation rows: the folder the list is showing, the
 * search that narrows it, and the two filter pills.
 *
 * The redesign (elli-ui#921) moves these out of a bar spanning the whole
 * workspace and into the list column itself, so the controls sit over the thing
 * they control and the reading pane starts at the top of the window. The folder
 * name is the heading *and* the folder menu's trigger — one affordance instead
 * of a label beside a select.
 */
export function MailListChrome({
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
}: MailListChromeProps) {
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recentSearches = useRecentEmailSearches();
  const showRecentSearches = searchFocused && !search.trim() && recentSearches.length > 0;

  const inboxFolder = folders.find((folder) => folder.key === 'inbox');
  const otherFolders = folders.filter((folder) => folder.key !== 'inbox');
  const selectedFolderRecord = folders.find(
    (folder) => folder.id === selectedFolder || folder.key === selectedFolder
  );
  const isOtherView = filter === 'other';
  const selectedFolderLabel = isOtherView
    ? 'Other'
    : (selectedFolderRecord?.name ??
      EMAIL_FOLDERS.find((folder) => folder.key === selectedFolder)?.label ??
      'Inbox');
  const selectedProject =
    projects.find((project) => project.entityId === selectedProjectId) ?? null;
  const selectedCategoryTag = categoryTags.find((tag) => tag.id === selectedCategoryTagId) ?? null;

  // Name what is on rather than counting it — "Unread · Our court" tells the
  // reader why the list is short, where a bare "2" does not.
  const activeFilterNames: string[] = [];
  if (isOtherView) {
    if (selectedCategoryTag) activeFilterNames.push(selectedCategoryTag.name);
  } else if (filter !== 'all') {
    activeFilterNames.push(FILTER_LABELS[filter]);
  }
  if (!isOtherView && statusFilter !== 'all') activeFilterNames.push(STATUS_LABELS[statusFilter]);

  const commitSearch = (value: string) => {
    onSearchChange(value);
    addRecentEmailSearch(value);
  };

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
      <div className="flex min-w-0 items-center gap-1 px-3.5 pb-1.5 pt-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-[7px] py-[3px] text-left text-lg font-semibold tracking-[-0.02em] text-mail-ink hover:bg-mail-chip focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
              disabled={!onSelectFolder}
              aria-label={`Folder: ${selectedFolderLabel}. Change folder`}
            >
              <span className="min-w-0 truncate">{selectedFolderLabel}</span>
              <ChevronDown aria-hidden="true" className="size-[15px] shrink-0 text-mail-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-96 w-64 overflow-y-auto">
            <DropdownMenuLabel className="text-[11px] text-mail-muted">Go to</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onSelectFolder?.(inboxFolder?.id ?? 'inbox')}>
              <Inbox aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">Inbox</span>
              {inboxFolder && inboxFolder.unreadCount > 0 && (
                <span className="font-mono text-xs tabular-nums text-mail-muted">
                  {inboxFolder.unreadCount}
                </span>
              )}
            </DropdownMenuItem>
            {/*
              Two distinct sections: "Categories" is a filter view ("Other" for
              uncategorised threads), "Folders" is the provider's real folder
              tree. Keeping them apart avoids overloading the word "Other".
            */}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] text-mail-muted">
              Categories
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={openOtherCategory}>
              <Tag aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">Other</span>
            </DropdownMenuItem>
            {otherFolders.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-mail-muted">
                  Folders
                </DropdownMenuLabel>
                {otherFolders.map((folder) => (
                  <DropdownMenuItem key={folder.id} onClick={() => onSelectFolder?.(folder.id)}>
                    <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                    {folder.unreadCount > 0 && (
                      <span className="font-mono text-xs tabular-nums text-mail-muted">
                        {folder.unreadCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {(onCreateFolder || onEmptyFolder) && <DropdownMenuSeparator />}
            {onCreateFolder && (
              <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus aria-hidden="true" />
                Create folder
              </DropdownMenuItem>
            )}
            {onEmptyFolder && (
              <DropdownMenuItem
                variant="destructive"
                disabled={emptyFolderDisabled}
                onClick={onEmptyFolder}
              >
                <Trash2 aria-hidden="true" />
                Empty {selectedFolderLabel}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {onRefresh && (
          <button
            type="button"
            className="ms-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-mail-muted hover:bg-mail-chip hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default motion-safe:transition-colors motion-safe:duration-100"
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            aria-label="Sync this mailbox"
            title="Sync"
            onClick={onRefresh}
          >
            <RefreshCcw
              aria-hidden="true"
              className={cn('size-4', isRefreshing && 'motion-safe:animate-spin')}
              strokeWidth={1.7}
            />
          </button>
        )}
        {onCompose && (
          <button
            type="button"
            className={cn(
              'flex h-[29px] shrink-0 cursor-pointer items-center gap-1 rounded-[7px] bg-mail-accent py-0 pe-2.5 ps-2 text-xs font-semibold text-mail-accent-foreground',
              'hover:bg-mail-accent-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45',
              !onRefresh && 'ms-auto'
            )}
            disabled={composeDisabled}
            onClick={onCompose}
          >
            <Plus aria-hidden="true" className="size-[13px]" strokeWidth={2.1} />
            New
          </button>
        )}
      </div>

      <div className="relative mx-3.5 mb-2">
        <label htmlFor="mail-list-search" className="sr-only">
          Search mail
        </label>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-[10px] py-1.5 pe-2.5 ps-3 motion-safe:transition-[background-color,box-shadow] motion-safe:duration-100',
            searchFocused
              ? 'bg-mail-card shadow-[0_0_0_1px_var(--mail-accent-edge),0_0_0_4px_var(--mail-accent-soft)]'
              : 'bg-mail-search'
          )}
        >
          <Search
            aria-hidden="true"
            className="size-[15px] shrink-0 text-mail-mid"
            strokeWidth={1.8}
          />
          <input
            ref={searchInputRef}
            id="mail-list-search"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={search}
            placeholder="Search"
            autoComplete="off"
            spellCheck={false}
            className="h-[19px] min-w-0 flex-1 border-0 bg-transparent py-px text-[13.5px] text-mail-ink outline-hidden placeholder:text-mail-mid"
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
              className="flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-mail-search-clear text-mail-mid hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
              aria-label="Clear search"
              // Clearing unmounts this button, so a mouse click that moved
              // focus onto it would drop focus to <body> when it goes — and the
              // next keystrokes would land nowhere. onMouseDown keeps focus in
              // the field for the mouse; the explicit focus() covers keyboard
              // activation, where no mousedown fires.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
            >
              <X aria-hidden="true" className="size-[11px]" strokeWidth={2.2} />
            </button>
          )}
        </div>

        {showRecentSearches && (
          <ul
            role="listbox"
            aria-label="Recent searches"
            className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-[11px] border border-mail-line bg-mail-card p-1 shadow-[0_10px_28px_rgba(26,28,31,0.11)]"
          >
            <li className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-medium text-mail-muted">Recent searches</span>
              <button
                type="button"
                tabIndex={-1}
                className="cursor-pointer text-[11px] font-medium text-mail-muted hover:text-mail-ink"
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
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[13px] text-mail-ink hover:bg-mail-accent-soft"
                  // onMouseDown so the field's blur never fires before the pick lands.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commitSearch(entry);
                  }}
                >
                  <Clock aria-hidden="true" className="size-3.5 shrink-0 text-mail-muted" />
                  <span className="min-w-0 truncate">{entry}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MailFilterPills
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={onProjectChange}
        activeFilterNames={activeFilterNames}
        isOtherView={isOtherView}
        filter={filter}
        statusFilter={statusFilter}
        categoryTags={categoryTags}
        selectedCategoryTagId={selectedCategoryTagId}
        onFilterChange={onFilterChange}
        onStatusFilterChange={onStatusFilterChange}
        onCategoryTagChange={onCategoryTagChange}
      />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
            <DialogDescription>
              Adds a folder to this mailbox at your mail provider.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={folderName}
            placeholder="Folder name"
            autoFocus
            onChange={(event) => setFolderName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitFolder();
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!folderName.trim()} onClick={submitFolder}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface MailFilterPillsProps {
  projects: EmailReferenceProject[];
  selectedProject: EmailReferenceProject | null;
  onProjectChange?: (projectId: string | null) => void;
  activeFilterNames: string[];
  isOtherView: boolean;
  filter: EmailListFilter;
  statusFilter: EmailStatusFilter;
  categoryTags: ConnectedEmailTag[];
  selectedCategoryTagId: string | null;
  onFilterChange: (filter: EmailListFilter) => void;
  onStatusFilterChange?: (statusFilter: EmailStatusFilter) => void;
  onCategoryTagChange?: (tagId: string | null) => void;
}

/**
 * One horizontally scrolling strip: the project button rides along with the
 * filter pill rather than wrapping onto a second line, so the list keeps the
 * same amount of vertical room whatever is switched on.
 */
function MailFilterPills({
  projects,
  selectedProject,
  onProjectChange,
  activeFilterNames,
  isOtherView,
  filter,
  statusFilter,
  categoryTags,
  selectedCategoryTagId,
  onFilterChange,
  onStatusFilterChange,
  onCategoryTagChange,
}: MailFilterPillsProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState<'' | 'l' | 'r' | 'lr'>('');

  // Only fade an edge that genuinely has more strip past it.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const measure = () => {
      const left = strip.scrollLeft > 2;
      const right = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2;
      setFade(left && right ? 'lr' : left ? 'l' : right ? 'r' : '');
    };
    measure();
    strip.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    return () => {
      strip.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [projects.length, activeFilterNames.length, selectedProject]);

  const isFiltered = activeFilterNames.length > 0;

  return (
    <div
      ref={stripRef}
      data-fade={fade}
      className={cn(
        'mail-pill-strip flex min-w-0 flex-nowrap gap-[7px] overflow-x-auto overflow-y-hidden px-3.5 pb-2',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex max-w-52 shrink-0 cursor-pointer items-center gap-[7px] rounded-full py-2 pe-[11px] ps-[13px] text-xs font-semibold text-mail-accent-foreground',
              'bg-[var(--mail-project-pill)] hover:bg-[var(--mail-project-pill-hover)] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
              !onProjectChange && 'pointer-events-none opacity-45'
            )}
            title={selectedProject ? selectedProject.label : 'Filter by project'}
          >
            {selectedProject ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 font-mono tracking-[-0.02em]">
                  {selectedProject.jobNumber ?? selectedProject.label}
                </span>
                {selectedProject.jobNumber && (
                  <span className="min-w-0 truncate font-medium opacity-85">
                    – {selectedProject.name}
                  </span>
                )}
              </span>
            ) : (
              <span>Project emails</span>
            )}
            <ChevronDown aria-hidden="true" className="size-[13px] shrink-0 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-80 overflow-y-auto">
          <DropdownMenuRadioGroup
            value={selectedProject?.entityId ?? 'all'}
            onValueChange={(value) => onProjectChange?.(value === 'all' ? null : value)}
          >
            <DropdownMenuLabel className="text-[11px] text-mail-muted">
              Filter by project
            </DropdownMenuLabel>
            <DropdownMenuRadioItem value="all">All emails</DropdownMenuRadioItem>
            {projects.length > 0 && <DropdownMenuSeparator />}
            {projects.length === 0 ? (
              <DropdownMenuItem disabled>No project mail yet</DropdownMenuItem>
            ) : (
              projects.map((project) => (
                <DropdownMenuRadioItem key={project.entityId} value={project.entityId}>
                  {project.jobNumber && (
                    <span className="shrink-0 font-mono text-xs text-mail-ink">
                      {project.jobNumber}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-mail-mid">{project.name}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-mail-muted">
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
          <button
            type="button"
            aria-pressed={isFiltered}
            title={
              isFiltered
                ? `Filtering by ${activeFilterNames.join(' and ')}`
                : 'Filter conversations'
            }
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
              isFiltered
                ? 'bg-mail-accent text-mail-accent-foreground hover:bg-mail-accent-hover'
                : 'bg-mail-chip text-mail-mid hover:bg-mail-chip-hover hover:text-mail-ink'
            )}
          >
            <ListFilter aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
            {isFiltered ? (
              activeFilterNames.map((name, index) => (
                <span key={name} className="flex items-center gap-1.5 whitespace-nowrap">
                  {index > 0 && (
                    <i
                      aria-hidden="true"
                      className="block h-[11px] w-px shrink-0 bg-current opacity-35"
                    />
                  )}
                  {name}
                </span>
              ))
            ) : (
              <span>Filters</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {isOtherView ? (
            <DropdownMenuRadioGroup
              value={selectedCategoryTagId ?? 'all'}
              onValueChange={(value) => onCategoryTagChange?.(value === 'all' ? null : value)}
            >
              <DropdownMenuLabel className="text-[11px] text-mail-muted">
                Filter by category
              </DropdownMenuLabel>
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
              <DropdownMenuLabel className="text-[11px] text-mail-muted">
                Show messages
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(value) => onFilterChange(value as EmailListFilter)}
              >
                <DropdownMenuRadioItem value="all">All emails</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="unread">Unread only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="flagged">Flagged</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="attachments">With attachments</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              {onStatusFilterChange && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] text-mail-muted">
                    Thread status
                  </DropdownMenuLabel>
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
    </div>
  );
}
