import { useEffect, useMemo, useRef, useState } from 'react';

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
  DropdownMenuCheckboxItem,
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
import {
  toggleFilterValue,
  type EmailListFilter,
  type EmailStatusFilter,
} from '@/modules/email/constants/email-filters';
import { EMAIL_FOLDERS } from '@/modules/email/constants/email-folders';
import {
  addRecentEmailSearch,
  clearRecentEmailSearches,
  useRecentEmailSearches,
} from '@/modules/email/hooks/use-recent-email-searches';
import {
  buildEmailFolderTree,
  emailFolderIndentClass,
} from '@/modules/email/lib/email-folder-tree';
import {
  splitPinnedEmailFolders,
  type PinnedEmailFolderKind,
} from '@/modules/email/lib/email-pinned-folders';
import {
  Archive,
  ArrowUpFromLine,
  ChevronDown,
  Clock,
  FilePen,
  FolderPlus,
  Inbox,
  ListFilter,
  MessagesSquare,
  PanelLeftClose,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  Tag,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * The mailbox's system folders, pinned under "Go to" beside the Inbox rather
 * than left to alphabetical order among the project folders (elli-ui#1442).
 * Which folders, and in what order, is `splitPinnedEmailFolders`.
 */
const PINNED_FOLDER_ICONS: Record<PinnedEmailFolderKind, LucideIcon> = {
  drafts: FilePen,
  sent: Send,
  deleted: Trash2,
  archive: Archive,
  junk: ShieldAlert,
  outbox: ArrowUpFromLine,
  history: MessagesSquare,
};

const FILTER_LABELS: Record<EmailListFilter, string> = {
  all: 'All emails',
  unread: 'Unread',
  flagged: 'Flagged',
  // "With attachments" rather than "Attachments" (elli-ui#1023): every entry in
  // this map is a predicate the list is narrowed by, and the bare noun read as
  // a place to find attachments instead of a filter over mail that has them.
  attachments: 'With attachments',
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
  /** Elli tags the Filters menu offers (elli-ui#1420), already ordered for this view. */
  filterTags?: ConnectedEmailTag[];
  selectedProjectId?: string | null;
  /** Tags narrowing the list; a thread carrying any of them matches. */
  selectedTagIds?: string[];
  /** Elli tags the folder menu offers as folders of their own. */
  folderTags?: ConnectedEmailTag[];
  /** The tag the list is showing as a folder, if any. */
  selectedTagFolder?: ConnectedEmailTag | null;
  isRefreshing?: boolean;
  composeDisabled?: boolean;
  onSelectFolder?: (folder: string) => void;
  onSelectTagFolder?: (tagId: string) => void;
  onFilterChange: (filter: EmailListFilter) => void;
  onStatusFilterChange?: (statusFilter: EmailStatusFilter) => void;
  onSearchChange: (search: string) => void;
  onProjectChange?: (projectId: string | null) => void;
  onTagFilterChange?: (tagIds: string[]) => void;
  onRefresh?: () => void;
  onCompose?: () => void;
  /** Closes the list column; the workspace's left-edge tab reopens it. */
  onCollapse?: () => void;
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
  filterTags = [],
  selectedProjectId = null,
  selectedTagIds = EMPTY_TAG_IDS,
  folderTags = [],
  selectedTagFolder = null,
  isRefreshing = false,
  composeDisabled = false,
  onSelectFolder,
  onSelectTagFolder,
  onFilterChange,
  onStatusFilterChange,
  onSearchChange,
  onProjectChange,
  onTagFilterChange,
  onRefresh,
  onCompose,
  onCollapse,
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
  // Only the folders the mailbox actually has: an account without an Archive
  // gets no row that opens an empty list.
  const { pinned: goToFolders, rest: unpinnedFolders } = useMemo(
    () => splitPinnedEmailFolders(folders),
    [folders]
  );
  // The mailbox's shape, not the order the API happened to answer in: the list
  // now carries nested folders too, and two folders called "Archive" at
  // different depths are indistinguishable laid out flat (elli-ui#1229).
  //
  // The "Go to" folders (Inbox and the system folders) are dropped before the
  // tree is built, not after, so anything nested inside them becomes a root
  // here. That is deliberate: each has its own entry at the top of this menu,
  // and indenting its children under a parent that is not in the section would
  // read as a missing row. Their own children still nest beneath them.
  const otherFolders = useMemo(() => buildEmailFolderTree(unpinnedFolders), [unpinnedFolders]);
  const selectedFolderRecord = folders.find(
    (folder) => folder.id === selectedFolder || folder.key === selectedFolder
  );
  const isOtherView = filter === 'other';
  const selectedFolderLabel = selectedTagFolder
    ? selectedTagFolder.name
    : isOtherView
      ? 'Other'
      : (selectedFolderRecord?.name ??
        EMAIL_FOLDERS.find((folder) => folder.key === selectedFolder)?.label ??
        'Inbox');
  const selectedProject =
    projects.find((project) => project.entityId === selectedProjectId) ?? null;
  const selectedTags = filterTags.filter((tag) => selectedTagIds.includes(tag.id));

  // Name what is on rather than counting it — "Unread · Our court" tells the
  // reader why the list is short, where a bare "2" does not.
  const activeFilterNames: string[] = [];
  if (!isOtherView && filter !== 'all') activeFilterNames.push(FILTER_LABELS[filter]);
  if (!isOtherView && statusFilter !== 'all') activeFilterNames.push(STATUS_LABELS[statusFilter]);
  // A chosen tag that no longer exists still filters (to nothing) — count it,
  // so the pill never says "Filters" over an emptied list.
  if (selectedTagIds.length === 1) {
    activeFilterNames.push(selectedTags[0]?.name ?? '1 tag');
  } else if (selectedTagIds.length > 1) {
    activeFilterNames.push(`${selectedTagIds.length} tags`);
  }

  const commitSearch = (value: string) => {
    onSearchChange(value);
    addRecentEmailSearch(value);
  };

  const openOtherCategory = () => {
    onSelectFolder?.(inboxFolder?.id ?? 'inbox');
    // Moving into Other drops any tag filter on its own (see
    // `applyMailboxUrlState`).
    onFilterChange('other');
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
      <div className="flex min-w-0 items-center gap-1 px-4 pb-2 pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-[7px] py-[3px] text-left text-lg font-semibold tracking-[-0.02em] text-mail-ink hover:bg-mail-chip focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-mail-paper motion-safe:transition-colors motion-safe:duration-100"
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
            {goToFolders.map(({ folder, kind }) => {
              const Icon = PINNED_FOLDER_ICONS[kind];
              return (
                <DropdownMenuItem key={folder.id} onClick={() => onSelectFolder?.(folder.id)}>
                  <Icon aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                  {folder.unreadCount > 0 && (
                    <span className="font-mono text-xs tabular-nums text-mail-muted">
                      {folder.unreadCount}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
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
            {/*
              Elli's own tags, each a folder of every thread carrying it. The
              mail stays where it was filed; a tag only gathers it here too.
            */}
            {onSelectTagFolder && folderTags.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-mail-muted">Tags</DropdownMenuLabel>
                {folderTags.map((tag) => (
                  <DropdownMenuItem key={tag.id} onClick={() => onSelectTagFolder(tag.id)}>
                    <Tag aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {otherFolders.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-mail-muted">
                  Folders
                </DropdownMenuLabel>
                {otherFolders.map(({ folder, depth }) => (
                  <DropdownMenuItem
                    key={folder.id}
                    className={emailFolderIndentClass(depth)}
                    onClick={() => onSelectFolder?.(folder.id)}
                  >
                    <span
                      className="min-w-0 flex-1 truncate"
                      title={folder.fullName ?? folder.name}
                    >
                      {folder.name}
                    </span>
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

        {onCollapse && (
          // Wide screens only: below `lg` the list and the message already
          // swap places, and there is no reopen tab there.
          <button
            type="button"
            className="ms-auto hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-mail-muted hover:bg-mail-chip hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-mail-paper motion-safe:transition-colors motion-safe:duration-100 lg:flex"
            aria-label="Hide email list"
            aria-expanded={true}
            title="Hide email list"
            onClick={onCollapse}
          >
            <PanelLeftClose aria-hidden="true" className="size-4" strokeWidth={1.7} />
          </button>
        )}
        {onRefresh && (
          <button
            type="button"
            className={cn(
              'ms-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-mail-muted hover:bg-mail-chip hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-mail-paper disabled:cursor-default motion-safe:transition-colors motion-safe:duration-100',
              // The collapse button takes the push on wide screens.
              onCollapse && 'lg:ms-0'
            )}
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
              'hover:bg-mail-accent-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-mail-paper disabled:opacity-45',
              !onRefresh && 'ms-auto',
              !onRefresh && onCollapse && 'lg:ms-0'
            )}
            disabled={composeDisabled}
            onClick={onCompose}
          >
            <Plus aria-hidden="true" className="size-[13px]" strokeWidth={2.1} />
            New
          </button>
        )}
      </div>

      <div className="relative mx-4 mb-2.5">
        <label htmlFor="mail-list-search" className="sr-only">
          Search mail
        </label>
        <div
          className={cn(
            // Resting, the field is a tint with a hairline edge: the tint alone
            // sat at 1.08:1 against the list and the field all but vanished
            // (elli-ui#1083). Focus lifts it onto the card surface. A field the
            // user typed into gets the same lift even once it loses focus,
            // so a query left in place still reads as active, not idle.
            'flex items-center gap-1.5 rounded-[10px] border py-2 pe-2.5 ps-3 motion-safe:transition-colors motion-safe:duration-100',
            searchFocused || search
              ? 'border-mail-line bg-mail-card'
              : 'border-mail-line bg-mail-search'
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
              className="flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-mail-search-clear/60 text-mail-mid hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-mail-paper motion-safe:transition-colors motion-safe:duration-100"
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
        filterTags={filterTags}
        selectedTagIds={selectedTagIds}
        onFilterChange={onFilterChange}
        onStatusFilterChange={onStatusFilterChange}
        onTagFilterChange={onTagFilterChange}
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

const EMPTY_TAG_IDS: string[] = [];

/**
 * The Tags part of the Filters menu (elli-ui#1420): every Elli tag, ticked
 * on and off without the menu closing, so three tags cost three clicks. A
 * thread carrying any ticked tag shows; the server answers it, so it covers
 * the whole folder, not just the pages already loaded.
 */
function TagFilterItems({
  tags,
  selectedIds,
  onChange,
}: {
  tags: ConnectedEmailTag[];
  selectedIds: string[];
  onChange?: (tagIds: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange?.(
      selectedIds.includes(id) ? selectedIds.filter((other) => other !== id) : [...selectedIds, id]
    );
  return (
    <>
      <DropdownMenuLabel className="text-[11px] text-mail-muted">Tags</DropdownMenuLabel>
      {tags.length === 0 ? (
        <DropdownMenuItem disabled>No tags yet</DropdownMenuItem>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          {tags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={selectedIds.includes(tag.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => toggle(tag.id)}
            >
              <span className="min-w-0 flex-1 truncate">{tag.name}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      )}
      {selectedIds.length > 0 ? (
        <DropdownMenuItem className="text-mail-muted" onSelect={() => onChange?.([])}>
          Clear tags
        </DropdownMenuItem>
      ) : null}
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
  filterTags: ConnectedEmailTag[];
  selectedTagIds: string[];
  onFilterChange: (filter: EmailListFilter) => void;
  onStatusFilterChange?: (statusFilter: EmailStatusFilter) => void;
  onTagFilterChange?: (tagIds: string[]) => void;
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
  filterTags,
  selectedTagIds,
  onFilterChange,
  onStatusFilterChange,
  onTagFilterChange,
}: MailFilterPillsProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState<'' | 'l' | 'r' | 'lr'>('');
  const [projectQuery, setProjectQuery] = useState('');
  const trimmedProjectQuery = projectQuery.trim().toLowerCase();
  // "All emails" isn't itself a search match, so it drops out with the rest
  // of the resting list once a query narrows things down.
  const showAllOption = !trimmedProjectQuery;
  const visibleProjects = trimmedProjectQuery
    ? projects.filter(
        (project) =>
          project.name.toLowerCase().includes(trimmedProjectQuery) ||
          (project.jobNumber?.toLowerCase().includes(trimmedProjectQuery) ?? false)
      )
    : projects;

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
        // `-mt-1 pt-1` buys the focus ring somewhere to draw without moving the
        // strip: overflow clips at the padding box, and with no top padding a
        // focused pill had its ring sliced off along the top edge.
        // `shrink-0`: the overflow makes the strip's min-height 0, so in the
        // pane's flex column the open unactioned banner squeezed it shut.
        'mail-pill-strip -mt-1 flex min-w-0 shrink-0 flex-nowrap gap-[7px] overflow-x-auto overflow-y-hidden px-4 pb-3 pt-1',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      )}
    >
      <DropdownMenu
        onOpenChange={(open) => {
          // A stale query from last time would have to be noticed and
          // cleared by hand before the full project list was visible again.
          if (!open) setProjectQuery('');
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-pressed={Boolean(selectedProject)}
            className={cn(
              'mail-pill flex cursor-pointer items-center gap-[7px] border py-[7px] pe-[11px] ps-[13px] text-xs font-semibold',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-mail-paper motion-safe:transition-colors motion-safe:duration-100',
              // Resting, this is not a filter — it is the label for the view
              // you are already in, and a filled navy pill announced it as the
              // loudest control on the screen (elli-ui#996). It now takes the
              // chip fill its neighbour `Filters` wears at rest, so the two
              // read as one row of controls, and keeps the accent for when a
              // project *is* selected and something really is filtered — the
              // same two-state rule `Filters` follows below.
              selectedProject
                ? // A project name can run long, and truncating it at the same
                  // fixed width as the resting "All project emails" label cut
                  // it off far earlier than it had to be. Sized to its own
                  // content (no `flex-1`, which grew the pill unconditionally
                  // even for a short name like "PS 515X") but capped at the
                  // strip's available width, so it only claims more than it
                  // needs once its own label is genuinely that long.
                  // `min-w-0` is load-bearing: a flex item's default
                  // `min-width: auto` blocks it from shrinking below its
                  // content's own width, so without it the pill would push
                  // the pills after it out of the strip (elli-ui#1139).
                  'min-w-0 max-w-full border-transparent bg-mail-accent text-mail-accent-foreground hover:bg-mail-accent-hover'
                : 'max-w-52 shrink-0 border-mail-line bg-mail-chip text-mail-ink hover:bg-mail-chip-hover',
              !onProjectChange && 'pointer-events-none opacity-45'
            )}
            title={selectedProject ? selectedProject.label : 'Filter by project'}
          >
            {selectedProject ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 tabular-nums">
                  {selectedProject.jobNumber ?? selectedProject.label}
                </span>
                {selectedProject.jobNumber && (
                  <span className="min-w-0 truncate font-medium opacity-85">
                    – {selectedProject.name}
                  </span>
                )}
              </span>
            ) : (
              // "All", because nothing is filtered out yet — the dropdown's own
              // resting option is `All emails`, and the pill now says the same
              // thing the menu does.
              <span>All project emails</span>
            )}
            {/* `ms-auto`: once the pill grows past its label's own width
                (elli-ui#1139), the chevron has to be pinned to the pill's
                own right edge — sitting right after the label left a gap
                of unclaimed pill between the two. */}
            <ChevronDown aria-hidden="true" className="ms-auto size-[13px] shrink-0 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-104 overflow-y-auto">
          {projects.length > 0 && (
            // `sticky top-0` pins the search box while the rows beneath it
            // scroll past — `-mx-2 -mt-2 px-2 pt-2` bleeds it out to the
            // content's own edges (its `p-2`) so it reaches the very top and
            // sides rather than floating inset, and `bg-popover` keeps a
            // scrolled-under row from showing through it.
            <div className="sticky top-0 z-10 -mx-2 -mt-2 rounded-t-md bg-popover px-2 pb-1.5 pt-1">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-mail-muted"
                />
                <Input
                  value={projectQuery}
                  onChange={(event) => setProjectQuery(event.target.value)}
                  placeholder="Search projects"
                  aria-label="Search projects"
                  className="h-8 rounded-md ps-7 text-xs"
                  // The list re-typing on every keystroke stole focus back to
                  // the trigger without this — the menu treats an ArrowDown
                  // as "move to the next item" by default, which an input
                  // needs for cursor movement instead (elli-ui#1136).
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </div>
            </div>
          )}
          <DropdownMenuRadioGroup
            // `mt-3`: the first row sat flush against the sticky search box
            // above it, so its own rounded top edge had no clearance to
            // render in and read as clipped flat under the search box's `z-10`
            // (the same class of bug as elli-ui#1091's sticky-header case).
            className="mt-3"
            value={selectedProject?.entityId ?? 'all'}
            onValueChange={(value) => onProjectChange?.(value === 'all' ? null : value)}
          >
            {showAllOption && <DropdownMenuRadioItem value="all">All emails</DropdownMenuRadioItem>}
            {projects.length > 0 && showAllOption && <DropdownMenuSeparator />}
            {visibleProjects.length === 0 ? (
              <DropdownMenuItem disabled>
                {projects.length === 0 ? 'No project mail yet' : 'No projects match your search'}
              </DropdownMenuItem>
            ) : (
              visibleProjects.map((project) => (
                <DropdownMenuRadioItem
                  key={project.entityId}
                  value={project.entityId}
                  className="ps-5"
                >
                  {/* The number and the name are one label, so they share a row
                      that owns the gap between them rather than relying on the
                      menu item's own spacing, which left them touching —
                      "28100-25Brooklyn Animal Care Center" (elli-ui#1020). The
                      number drops `font-mono` for the app's own face; it is an
                      identifier, not a column of figures to be scanned. */}
                  <span className="flex min-w-0 flex-1 items-baseline gap-2">
                    {project.jobNumber && (
                      /* A floor under the number so the names start on one
                         line (elli-ui#1081). Job numbers run from five
                         characters to nine — "30000" against "28100-25" — and
                         with the column sized to each one the names stepped in
                         and out down the menu. `tabular-nums` holds the digits
                         to one width so the same number of characters is
                         always the same length. */
                      <span className="w-[4.75rem] shrink-0 text-xs font-medium tabular-nums text-mail-ink">
                        {project.jobNumber}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-mail-mid">{project.name}</span>
                  </span>
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
              'mail-pill flex shrink-0 cursor-pointer items-center gap-1.5 border px-3 py-[7px] text-xs font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-mail-paper motion-safe:transition-colors motion-safe:duration-100',
              isFiltered
                ? 'border-transparent bg-mail-accent text-mail-accent-foreground hover:bg-mail-accent-hover'
                : 'border-mail-line bg-mail-chip text-mail-ink hover:bg-mail-chip-hover'
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
            <TagFilterItems
              tags={filterTags}
              selectedIds={selectedTagIds}
              onChange={onTagFilterChange}
            />
          ) : (
            <>
              <DropdownMenuLabel className="text-[11px] text-mail-muted">
                Show messages
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(value) =>
                  onFilterChange(toggleFilterValue(filter, value as EmailListFilter, 'all'))
                }
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
                    onValueChange={(value) =>
                      onStatusFilterChange(
                        toggleFilterValue(statusFilter, value as EmailStatusFilter, 'all')
                      )
                    }
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
              {onTagFilterChange ? (
                <>
                  <DropdownMenuSeparator />
                  <TagFilterItems
                    tags={filterTags}
                    selectedIds={selectedTagIds}
                    onChange={onTagFilterChange}
                  />
                </>
              ) : null}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
