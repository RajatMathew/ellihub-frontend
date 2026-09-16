import type { EmailWorkspaceView } from '@/modules/email/components/mail-account-bar';
import type { EmailListFilter, EmailStatusFilter } from '@/modules/email/constants/email-filters';

/**
 * The single source of truth for how the mailbox's view/filter state is encoded
 * into the query string, and how a query string is decoded back into state.
 *
 *   /app/email/accounts/:accountSlug/:folder?view=…&filter=…&status=…&tag=…&project=…&q=…
 *
 * Folder and the open conversation stay in the path (see `email-paths.ts`);
 * everything that narrows what the folder shows lives here, so a filtered view
 * can be linked, bookmarked and reloaded.
 *
 * Two rules keep the URLs honest:
 *   - defaults are never written, so a plain inbox stays a bare URL;
 *   - anything unrecognised decodes to its default rather than reaching the API.
 */
export interface MailboxUrlState {
  /** Which workspace the mailbox shell shows. */
  view: EmailWorkspaceView;
  /** The mail list's primary filter (unread / flagged / attachments / other). */
  filter: EmailListFilter;
  /** Thread-status filter, applied on top of `filter`. */
  statusFilter: EmailStatusFilter;
  /** Elli tag id narrowing the "Other" filter. Only meaningful when `filter === 'other'`. */
  categoryTagId: string | null;
  /** Reference-project id the list is scoped to. */
  projectId: string | null;
  /** Free-text message search. */
  search: string;
}

/** Query-string key for each field. Changing one here changes it everywhere. */
export const MAILBOX_URL_PARAMS = {
  view: 'view',
  filter: 'filter',
  status: 'status',
  tag: 'tag',
  project: 'project',
  search: 'q',
} as const;

export const DEFAULT_MAILBOX_URL_STATE: MailboxUrlState = {
  view: 'mail',
  filter: 'all',
  statusFilter: 'all',
  categoryTagId: null,
  projectId: null,
  search: '',
};

/** Everything the mail toolbar can narrow by, back to its default. */
export const MAILBOX_FILTER_RESET: Partial<MailboxUrlState> = {
  filter: DEFAULT_MAILBOX_URL_STATE.filter,
  statusFilter: DEFAULT_MAILBOX_URL_STATE.statusFilter,
  categoryTagId: DEFAULT_MAILBOX_URL_STATE.categoryTagId,
  projectId: DEFAULT_MAILBOX_URL_STATE.projectId,
  search: DEFAULT_MAILBOX_URL_STATE.search,
};

const WORKSPACE_VIEWS: ReadonlySet<string> = new Set<EmailWorkspaceView>([
  'mail',
  'calendar',
  'tasks',
]);
const LIST_FILTERS: ReadonlySet<string> = new Set<EmailListFilter>([
  'all',
  'unread',
  'flagged',
  'attachments',
  'other',
]);
const STATUS_FILTERS: ReadonlySet<string> = new Set<EmailStatusFilter>([
  'all',
  'open',
  'open_our_court',
  'open_their_court',
  'closed',
]);

/**
 * Provider ids (folders, tags, conversations) are base64-ish and long, but not
 * unbounded. A value past this is a hand-mangled URL, not an id — drop it
 * rather than forward it to the provider.
 */
const MAX_ID_LENGTH = 512;
const MAX_SEARCH_LENGTH = 256;

function parseOption<TValue extends string>(
  raw: string | null,
  allowed: ReadonlySet<string>,
  fallback: TValue
): TValue {
  return raw !== null && allowed.has(raw) ? (raw as TValue) : fallback;
}

function parseId(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim();
  if (!value || value.length > MAX_ID_LENGTH) return null;
  return value;
}

function parseSearch(raw: string | null): string {
  if (raw === null) return '';
  return raw.trim().slice(0, MAX_SEARCH_LENGTH);
}

/**
 * Resolves combinations the UI cannot produce but a hand-edited URL can, so a
 * pasted link always lands on a state the toolbar can actually render.
 */
export function normalizeMailboxUrlState(state: MailboxUrlState): MailboxUrlState {
  // "Other" shows unclassified mail, which cannot intersect a project filter.
  const filter = state.projectId && state.filter === 'other' ? 'all' : state.filter;
  // The category tag only ever narrows the "Other" filter.
  const categoryTagId = filter === 'other' ? state.categoryTagId : null;
  return { ...state, filter, categoryTagId };
}

/** Decodes a query string into mailbox state, falling back to defaults. */
export function parseMailboxUrlState(params: URLSearchParams): MailboxUrlState {
  return normalizeMailboxUrlState({
    view: parseOption(
      params.get(MAILBOX_URL_PARAMS.view),
      WORKSPACE_VIEWS,
      DEFAULT_MAILBOX_URL_STATE.view
    ),
    filter: parseOption(
      params.get(MAILBOX_URL_PARAMS.filter),
      LIST_FILTERS,
      DEFAULT_MAILBOX_URL_STATE.filter
    ),
    statusFilter: parseOption(
      params.get(MAILBOX_URL_PARAMS.status),
      STATUS_FILTERS,
      DEFAULT_MAILBOX_URL_STATE.statusFilter
    ),
    categoryTagId: parseId(params.get(MAILBOX_URL_PARAMS.tag)),
    projectId: parseId(params.get(MAILBOX_URL_PARAMS.project)),
    search: parseSearch(params.get(MAILBOX_URL_PARAMS.search)),
  });
}

function setOrDelete(params: URLSearchParams, key: string, value: string | null) {
  if (value === null) params.delete(key);
  else params.set(key, value);
}

/**
 * Applies a patch on top of the state already encoded in `params` and returns a
 * new `URLSearchParams`. Params this module does not own (`setupNickname`,
 * `discovery`, `emailAuth`, …) are carried through untouched, and any field
 * left at its default is removed rather than written.
 */
export function applyMailboxUrlState(
  params: URLSearchParams,
  patch: Partial<MailboxUrlState>
): URLSearchParams {
  const current = parseMailboxUrlState(params);
  const merged: MailboxUrlState = {
    view: patch.view ?? current.view,
    filter: patch.filter ?? current.filter,
    statusFilter: patch.statusFilter ?? current.statusFilter,
    categoryTagId: patch.categoryTagId !== undefined ? patch.categoryTagId : current.categoryTagId,
    projectId: patch.projectId !== undefined ? patch.projectId : current.projectId,
    search: patch.search !== undefined ? parseSearch(patch.search) : current.search,
  };
  // Project and "Other" are mutually exclusive. `normalizeMailboxUrlState`
  // resolves that in favour of the project, which is right for a URL typed from
  // scratch but wrong for a toolbar click — there the value being set wins.
  const next = normalizeMailboxUrlState(
    patch.filter === 'other' && patch.projectId === undefined
      ? { ...merged, projectId: null }
      : merged
  );

  const result = new URLSearchParams(params);
  setOrDelete(
    result,
    MAILBOX_URL_PARAMS.view,
    next.view === DEFAULT_MAILBOX_URL_STATE.view ? null : next.view
  );
  setOrDelete(
    result,
    MAILBOX_URL_PARAMS.filter,
    next.filter === DEFAULT_MAILBOX_URL_STATE.filter ? null : next.filter
  );
  setOrDelete(
    result,
    MAILBOX_URL_PARAMS.status,
    next.statusFilter === DEFAULT_MAILBOX_URL_STATE.statusFilter ? null : next.statusFilter
  );
  setOrDelete(result, MAILBOX_URL_PARAMS.tag, next.categoryTagId);
  setOrDelete(result, MAILBOX_URL_PARAMS.project, next.projectId);
  setOrDelete(result, MAILBOX_URL_PARAMS.search, next.search || null);
  return result;
}

/**
 * The encoded query string (no leading `?`) for `params` with `patch` applied —
 * what path-changing navigations append so folder and message links keep the
 * active filters instead of silently dropping them.
 */
export function buildMailboxSearchString(
  params: URLSearchParams,
  patch: Partial<MailboxUrlState> = {}
): string {
  return applyMailboxUrlState(params, patch).toString();
}

/**
 * What the search box knows about the term in the URL.
 *
 * The box leads the URL by a debounce, so the two are routinely out of step and
 * "out of step" alone cannot mean "someone else changed the URL". These two
 * fields are what tells the two cases apart.
 */
export interface MailboxSearchSyncState {
  /** The term the URL held the last time the box looked at it. */
  committedSearch: string;
  /**
   * A term the box itself wrote to the URL whose navigation has not been seen
   * yet, or `null` when nothing is in flight.
   */
  pendingCommit: string | null;
}

/** What `resolveMailboxSearchSync` decided to do about the term in the URL. */
export interface MailboxSearchSyncResolution {
  /** The sync state to move to, or `null` when nothing has to change. */
  next: MailboxSearchSyncState | null;
  /**
   * The term to type back into the box, or `null` to leave whatever the user
   * has typed alone.
   */
  draft: string | null;
}

/**
 * Reconciles the search box with the term in the URL.
 *
 * A search commit is two updates — the box records what it wrote, and the
 * router navigates — and React does not have to apply them in the same render:
 * `BrowserRouter` publishes the new location inside `startTransition`, so the
 * higher-priority state update can render one or more times against the *old*
 * location first. Comparing the box's term to the URL's on its own therefore
 * reports a phantom "someone else changed the URL" in that window, and typing
 * the old term back in swallows whatever was typed since.
 *
 * Remembering the term that was written (`pendingCommit`) closes that window:
 * a URL that matches it is this box's own commit arriving late and must never
 * overwrite the draft; a URL that matches neither it nor the last committed
 * term is a genuine outside change — Back/Forward, a filter reset, a folder
 * switch — and is typed back in.
 */
export function resolveMailboxSearchSync(
  sync: MailboxSearchSyncState,
  urlSearch: string
): MailboxSearchSyncResolution {
  if (sync.pendingCommit !== null && sync.pendingCommit === urlSearch) {
    return { next: { committedSearch: urlSearch, pendingCommit: null }, draft: null };
  }
  if (sync.committedSearch === urlSearch) {
    return { next: null, draft: null };
  }
  return { next: { committedSearch: urlSearch, pendingCommit: null }, draft: urlSearch };
}
