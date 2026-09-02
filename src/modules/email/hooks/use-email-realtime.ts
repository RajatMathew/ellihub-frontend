import { useEffect } from 'react';

import { emailKeys } from '@/modules/email/hooks/email.hooks';
import { useQueryClient } from '@tanstack/react-query';

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
        const parsed = data as { type?: string; accountId?: string };
        if (parsed?.type !== 'email.synced' || !parsed.accountId) return;
        void queryClient.invalidateQueries({
          queryKey: emailKeys.messagesRoot(parsed.accountId),
        });
        void queryClient.invalidateQueries({
          queryKey: emailKeys.conversationRoot(parsed.accountId),
        });
        void queryClient.invalidateQueries({ queryKey: emailKeys.folders(parsed.accountId) });
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
  }, [enabled, queryClient]);
}
