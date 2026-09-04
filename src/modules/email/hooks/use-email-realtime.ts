import { useEffect } from 'react';

import {
  emailListItemSchema,
  type ConnectedEmailListItem,
  type EmailAccount,
  type EmailMessagePage,
} from '@/modules/email/api/email.api';
import { showNewMailToast } from '@/modules/email/components/email-new-mail-toast';
import { emailKeys } from '@/modules/email/hooks/email.hooks';
import { buildMailPath } from '@/modules/email/lib/email-paths';
import { useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Live mail updates: one WebSocket to the API's /email/realtime endpoint
 * (session cookie authenticates the upgrade). On `email.synced` the affected
 * account's message/conversation/folder queries are invalidated, so whatever
 * is on screen refetches — new mail appears without a reload.
 * Reconnects with capped exponential backoff and cleans up on unmount.
 */
export function useEmailRealtime(enabled: boolean) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let attempts = 0;
    let disposed = false;

    const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const url = new URL('/api/v1/email/realtime', base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(url.toString());
      socket.onopen = () => {
        attempts = 0;
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

        // Insert the new message into any already-loaded inbox view right away,
        // instead of only invalidating and waiting on a full refetch round trip
        // before it appears. The background invalidation below still runs to
        // reconcile anything this optimistic insert can't cover (other folders,
        // filtered/search views, unread counts, etc).
        const parsedItem = emailListItemSchema.safeParse(parsed.newMailItem);
        if (parsedItem.success) {
          insertRealtimeMessage(queryClient, eventAccountId, parsedItem.data);
        }

        void queryClient.invalidateQueries({
          queryKey: emailKeys.messagesRoot(eventAccountId),
        });
        void queryClient.invalidateQueries({
          queryKey: emailKeys.conversationRoot(eventAccountId),
        });
        void queryClient.invalidateQueries({ queryKey: emailKeys.folders(eventAccountId) });

        const newMail = parsed.newMail;
        if (newMail?.conversationId) {
          const accounts = queryClient.getQueryData<EmailAccount[]>(emailKeys.accounts());
          const account = accounts?.find((item) => item.id === eventAccountId);
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
    return () => {
      disposed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled, navigate, queryClient]);
}

/**
 * Splices a freshly-synced message straight into the plain, unfiltered Inbox
 * view's cache — the common case a user is actually looking at when new mail
 * lands. Search/project/classification-scoped views and other folders are
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
    const [folder, , search, projectId, classification] = key.slice(3);
    if (folder !== 'inbox' || search || projectId || classification) continue;

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
