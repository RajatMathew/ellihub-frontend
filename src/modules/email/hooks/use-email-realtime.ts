import { useEffect, useRef } from 'react';

import {
  emailListItemSchema,
  type ConnectedEmailListItem,
  type EmailAccount,
  type EmailMessagePage,
} from '@/modules/email/api/email.api';
import { showNewMailToast } from '@/modules/email/components/email-new-mail-toast';
import { emailKeys } from '@/modules/email/hooks/email.hooks';
import { shouldCatchUpOnOpen, shouldCatchUpOnVisible } from '@/modules/email/lib/email-catch-up';
import { buildMailPath } from '@/modules/email/lib/email-paths';
import {
  decideEmailRealtimeScope,
  DEFAULT_EMAIL_NOTIFICATION_SCOPE,
  type EmailNotificationScope,
} from '@/modules/email/lib/email-realtime-scope';
import { createEmailRefetchCoalescer } from '@/modules/email/lib/email-refetch-coalescer';
import { statusFilterAdmitsNewMail } from '@/modules/email/lib/email-status-filter';
import { emailSyncedActions } from '@/modules/email/lib/email-synced-actions';
import { useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

/** Window over which a burst of sync events collapses into one refetch. */
const REFETCH_COALESCE_MS = 1500;

/**
 * Live mail updates: one WebSocket to the API's /email/realtime endpoint
 * (session cookie authenticates the upgrade). On `email.synced` the affected
 * account's message/conversation/folder queries are invalidated, so whatever
 * is on screen refetches — new mail appears without a reload.
 * Reconnects with capped exponential backoff and cleans up on unmount.
 *
 * Every event is scoped before it is acted on (`decideEmailRealtimeScope`): the
 * server fans realtime events out per organization, so an event for another
 * user's mailbox can reach this socket (elli-ui#918). One that this session is
 * not entitled to is dropped before it touches the cache or the toast.
 *
 * `activeAccountId` is the mailbox currently open. It is read through a ref at
 * event time rather than captured by the effect, so switching mailboxes does
 * not reconnect the socket and cannot leave a handler answering with the
 * previously open account.
 */
export function useEmailRealtime(
  activeAccountId: string | undefined,
  scope: EmailNotificationScope = DEFAULT_EMAIL_NOTIFICATION_SCOPE
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const activeAccountIdRef = useRef<string | undefined>(activeAccountId);
  const scopeRef = useRef<EmailNotificationScope>(scope);

  useEffect(() => {
    activeAccountIdRef.current = activeAccountId;
    scopeRef.current = scope;
  }, [activeAccountId, scope]);

  const enabled = Boolean(activeAccountId);

  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    // Coalesce a burst of events into one refetch per account. Several messages
    // arriving at once is one sync as far as the views are concerned.
    const refetch = createEmailRefetchCoalescer(REFETCH_COALESCE_MS, (accountId) => {
      void queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(accountId) });
      void queryClient.invalidateQueries({ queryKey: emailKeys.conversationRoot(accountId) });
      void queryClient.invalidateQueries({ queryKey: emailKeys.folders(accountId) });
      // Elliot filing a thread sends a change too; its strip and task draft come with it.
      void queryClient.invalidateQueries({ queryKey: emailKeys.aiSuggestionRoot(accountId) });
    });
    const scheduleRefetch = refetch.schedule;
    let attempts = 0;
    let disposed = false;
    let openCount = 0;
    let hiddenAt: number | null = null;

    /**
     * A hidden tab is not a connected one.
     *
     * Two things happen while a tab sits in the background, and together they
     * are how a mailbox ends up a day stale. The machine sleeps and the socket
     * closes, and the reconnect that should follow is a `setTimeout` — which
     * browsers throttle hard in a background tab, so the retry can be delayed
     * long past its backoff. Coming back to the tab therefore has to do two
     * things: reconnect now rather than waiting on a throttled timer, and
     * refetch, because the socket was not listening for whatever arrived.
     */
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      const hiddenFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;

      if (socket === null || socket.readyState > WebSocket.OPEN) {
        if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
        connect();
      }

      const accountId = activeAccountIdRef.current;
      if (accountId && shouldCatchUpOnVisible(hiddenFor)) scheduleRefetch(accountId);
    };

    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const url = new URL('/api/v1/email/realtime', base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(url.toString());
      socket.onopen = () => {
        attempts = 0;
        openCount += 1;
        // Anything published while the socket was down was never delivered and
        // is not replayed, so a reconnect has to go and ask. Skipped on the
        // very first open, where the page's own queries are already in flight.
        const accountId = activeAccountIdRef.current;
        if (accountId && shouldCatchUpOnOpen(openCount)) scheduleRefetch(accountId);
      };
      socket.onmessage = (event) => {
        let data: unknown;
        try {
          data = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const parsed = data as {
          type?: string;
          accountId?: string;
          changed?: boolean;
          newMail?: {
            count: number;
            senderName: string | null;
            senderEmail: string | null;
            subject: string | null;
            preview: string | null;
            conversationId: string;
          };
          newMailItem?: unknown;
        };
        if (parsed?.type !== 'email.synced' || !parsed.accountId) return;
        const eventAccountId = parsed.accountId;

        // Defence in depth: never act on an event for a mailbox this session is
        // not entitled to, whatever the server sent. Read the account list from
        // the cache *now* — a captured array would go stale the moment the user
        // connects, disconnects or switches accounts.
        const knownAccounts = queryClient.getQueryData<EmailAccount[]>(emailKeys.accounts());
        const decision = decideEmailRealtimeScope({
          eventAccountId,
          knownAccountIds: knownAccounts?.map((account) => account.id) ?? [],
          activeAccountId: activeAccountIdRef.current ?? null,
          scope: scopeRef.current,
        });
        if (decision.isScopeViolation) {
          // A server-side scoping fault, not a user-facing problem. Log it so it
          // stays diagnosable instead of being silently swallowed here.
          console.warn(
            '[email realtime] dropped an email.synced event for an account this session is not entitled to',
            { accountId: eventAccountId }
          );
        }
        if (!decision.allowCacheWrite) return;

        // Insert the new message into any already-loaded inbox view right away,
        // instead of only invalidating and waiting on a full refetch round trip
        // before it appears. The background invalidation below still runs to
        // reconcile anything this optimistic insert can't cover (other folders,
        // filtered/search views, unread counts, etc).
        const parsedItem = emailListItemSchema.safeParse(parsed.newMailItem);
        if (parsedItem.success) {
          insertRealtimeMessage(queryClient, eventAccountId, parsedItem.data);
        }

        // Only when the sync actually landed something — see
        // `emailSyncedActions` for why that is the server's `changed` flag and
        // not the arrival of the event, and why the toast is a narrower gate
        // than the refetch.
        const actions = emailSyncedActions(parsed);
        if (actions.refetch) scheduleRefetch(eventAccountId);

        const newMail = parsed.newMail;
        if (actions.notify && decision.allowNotification && newMail?.conversationId) {
          const account = knownAccounts?.find((item) => item.id === eventAccountId);
          const slug = account?.slug ?? eventAccountId;
          showNewMailToast({
            accountId: eventAccountId,
            senderName: newMail.senderName,
            senderEmail: newMail.senderEmail,
            subject: newMail.subject,
            preview: newMail.preview,
            conversationId: newMail.conversationId,
            count: newMail.count,
            onOpen: () => navigate(buildMailPath(slug, 'inbox', newMail.conversationId)),
          });
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        attempts += 1;
        const delay =
          Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempts) + Math.random() * 500;
        reconnectTimer = window.setTimeout(connect, delay);
      };
      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      refetch.cancel();
      socket?.close();
    };
  }, [enabled, navigate, queryClient]);
}

/**
 * Splices a freshly-synced message straight into the plain, unfiltered Inbox
 * view's cache — the common case a user is actually looking at when new mail
 * lands. Search/project/classification/tag-scoped views and other folders are
 * left to the invalidate-triggered refetch, since we can't cheaply tell
 * whether this message belongs in them.
 */
function insertRealtimeMessage(
  queryClient: QueryClient,
  accountId: string,
  item: ConnectedEmailListItem
) {
  const matches = queryClient.getQueriesData<InfiniteData<EmailMessagePage>>({
    queryKey: emailKeys.messagesRoot(accountId),
  });

  for (const [queryKey, data] of matches) {
    if (!data || data.pages.length === 0) continue;

    const key = queryKey as readonly unknown[];
    const [folder, , search, projectId, classification, , , , status, tagId, tagIds] = key.slice(3);
    if (folder !== 'inbox' || search || projectId || classification || tagId || tagIds) continue;
    if (!statusFilterAdmitsNewMail(status)) continue;

    const alreadyPresent = data.pages.some((page) =>
      page.records.some(
        (record) => record.id === item.id || record.conversationKey === item.conversationKey
      )
    );
    if (alreadyPresent) continue;

    const [firstPage, ...rest] = data.pages;
    const updatedFirstPage: EmailMessagePage = {
      ...firstPage,
      records: [item, ...firstPage.records],
      totalCount:
        typeof firstPage.totalCount === 'number' ? firstPage.totalCount + 1 : firstPage.totalCount,
    };
    queryClient.setQueryData<InfiniteData<EmailMessagePage>>(queryKey, {
      ...data,
      pages: [updatedFirstPage, ...rest],
    });
  }
}
