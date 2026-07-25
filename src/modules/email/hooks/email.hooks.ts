import { toastApiError } from '@/app/lib/toast-api-error';
import {
  emailApi,
  type ConnectedEmailFolder,
  type ConnectedEmailListItem,
  type ConnectedEmailTag,
  type EmailAccount,
  type EmailMessagePage,
  type EmailProvider,
  type ReplyConnectedEmailPayload,
  type SendConnectedEmailPayload,
} from '@/modules/email/api';
import {
  EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
  EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
} from '@/modules/email/constants/email-account-storage';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { toast } from 'sonner';

const EMAIL_METADATA_STALE_TIME_MS = 5 * 60 * 1000;
const EMAIL_MESSAGES_STALE_TIME_MS = 60 * 1000;
const EMAIL_MESSAGES_CACHE_TIME_MS = 15 * 60 * 1000;

export const emailKeys = {
  all: ['connected-email'] as const,
  accounts: () => [...emailKeys.all, 'accounts'] as const,
  folders: (accountId?: string) => [...emailKeys.all, 'folders', accountId] as const,
  tags: (accountId?: string) => [...emailKeys.all, 'tags', accountId] as const,
  messagesRoot: (accountId?: string) => [...emailKeys.all, 'messages', accountId] as const,
  messages: (accountId?: string, folder?: string, size?: number, search?: string) =>
    [...emailKeys.messagesRoot(accountId), folder, size, search] as const,
  message: (accountId?: string, messageId?: string | null) =>
    [...emailKeys.all, 'message', accountId, messageId] as const,
  conversationRoot: (accountId?: string) => [...emailKeys.all, 'conversation', accountId] as const,
  conversation: (accountId?: string, threadId?: string | null) =>
    [...emailKeys.conversationRoot(accountId), threadId] as const,
};

export const useEmailAccountsQuery = () =>
  useQuery({
    queryKey: emailKeys.accounts(),
    queryFn: emailApi.listAccounts,
    staleTime: EMAIL_METADATA_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useEmailFoldersQuery = (accountId?: string) =>
  useQuery({
    queryKey: emailKeys.folders(accountId),
    queryFn: () => emailApi.listFolders(accountId!),
    enabled: Boolean(accountId),
    staleTime: EMAIL_METADATA_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useEmailTagsQuery = (accountId?: string) =>
  useQuery({
    queryKey: emailKeys.tags(accountId),
    queryFn: () => emailApi.listTags(accountId!),
    enabled: Boolean(accountId),
    staleTime: EMAIL_METADATA_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useEmailMessagesQuery = (
  accountId: string | undefined,
  folder: { key?: EmailFolderKey; id?: string },
  pagination?: { size?: number; search?: string }
) =>
  useInfiniteQuery({
    queryKey: emailKeys.messages(
      accountId,
      folder.id ?? folder.key,
      pagination?.size,
      pagination?.search
    ),
    queryFn: ({ pageParam }) =>
      emailApi.listMessages({
        accountId: accountId!,
        folderKey: folder.key,
        folderId: folder.id,
        pageToken: pageParam ?? undefined,
        size: pagination?.size,
        search: pagination?.search,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    enabled: Boolean(accountId),
    staleTime: EMAIL_MESSAGES_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

export const useRefreshEmailMessagesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { accountId: string; daysWithin?: number }) => {
      return emailApi.syncAccount(payload.accountId, payload.daysWithin);
    },
    onSuccess: async (result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: emailKeys.messagesRoot(payload.accountId),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: emailKeys.folders(payload.accountId),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: emailKeys.tags(payload.accountId),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({ queryKey: emailKeys.accounts(), refetchType: 'active' }),
      ]);
      if (result.hasMore) {
        toast.info('Recent email changes are still catching up. Refresh again to continue.');
      }
    },
    onError: (error) => toastApiError(error, 'Failed to refresh emails.'),
  });
};

export const useEmailConversationQuery = (
  accountId: string | undefined,
  threadId: string | null | undefined
) =>
  useQuery({
    queryKey: emailKeys.conversation(accountId, threadId),
    queryFn: () => emailApi.listConversation(accountId!, threadId!),
    enabled: Boolean(accountId && threadId),
    staleTime: EMAIL_MESSAGES_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useEmailMessageQuery = (
  accountId: string | undefined,
  messageId: string | null | undefined,
  enabled = true
) =>
  useQuery({
    queryKey: emailKeys.message(accountId, messageId),
    queryFn: () => emailApi.getMessage(accountId!, messageId!),
    enabled: enabled && Boolean(accountId && messageId),
    staleTime: EMAIL_MESSAGES_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

export const useStartEmailAuthMutation = () =>
  useMutation({
    mutationFn: (provider: EmailProvider) => emailApi.startAuth(provider),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
    onError: (error) => toastApiError(error, 'Unable to start email account connection.'),
  });

type DisconnectAccountSnapshot = {
  accounts: EmailAccount[] | undefined;
  connectedAccountsStorage: string | null;
  selectedAccountStorage: string | null;
};

function writeConnectedAccountsStorage(accounts: EmailAccount[]) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(
      accounts.map((account) => ({
        id: account.id,
        slug: getEmailAccountSlug(account),
        email: account.email,
        mailboxAddress: account.mailboxAddress,
        displayName: account.displayName,
        provider: account.provider,
      }))
    )
  );
}

function restoreAccountStorage(snapshot: DisconnectAccountSnapshot | undefined) {
  if (!snapshot || typeof window === 'undefined') return;

  if (snapshot.connectedAccountsStorage === null) {
    window.localStorage.removeItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY);
  } else {
    window.localStorage.setItem(
      EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY,
      snapshot.connectedAccountsStorage
    );
  }

  if (snapshot.selectedAccountStorage === null) {
    window.localStorage.removeItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);
  } else {
    window.localStorage.setItem(
      EMAIL_SELECTED_ACCOUNT_STORAGE_KEY,
      snapshot.selectedAccountStorage
    );
  }
}

export const useDisconnectEmailAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { accountId: string }) => emailApi.disconnectAccount(payload.accountId),
    onMutate: async (payload): Promise<DisconnectAccountSnapshot> => {
      await queryClient.cancelQueries({ queryKey: emailKeys.accounts() });

      const accounts = queryClient.getQueryData<EmailAccount[]>(emailKeys.accounts());
      const nextAccounts = accounts?.filter((account) => account.id !== payload.accountId);
      const disconnectedAccount = accounts?.find((account) => account.id === payload.accountId);
      const disconnectedSlug = disconnectedAccount
        ? getEmailAccountSlug(disconnectedAccount)
        : null;
      const snapshot = {
        accounts,
        connectedAccountsStorage:
          typeof window === 'undefined'
            ? null
            : window.localStorage.getItem(EMAIL_CONNECTED_ACCOUNTS_STORAGE_KEY),
        selectedAccountStorage:
          typeof window === 'undefined'
            ? null
            : window.localStorage.getItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY),
      };

      if (nextAccounts) {
        queryClient.setQueryData<EmailAccount[]>(emailKeys.accounts(), nextAccounts);
        writeConnectedAccountsStorage(nextAccounts);
      }

      if (typeof window !== 'undefined') {
        const selectedAccount = window.localStorage.getItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);
        if (
          selectedAccount &&
          (selectedAccount === payload.accountId || selectedAccount === disconnectedSlug)
        ) {
          window.localStorage.removeItem(EMAIL_SELECTED_ACCOUNT_STORAGE_KEY);
        }
      }

      queryClient.removeQueries({ queryKey: emailKeys.folders(payload.accountId) });
      queryClient.removeQueries({ queryKey: emailKeys.tags(payload.accountId) });
      queryClient.removeQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) });
      queryClient.removeQueries({ queryKey: emailKeys.conversationRoot(payload.accountId) });
      toast.success('Email account disconnected.');

      return snapshot;
    },
    onError: (error, _payload, snapshot) => {
      queryClient.setQueryData(emailKeys.accounts(), snapshot?.accounts);
      restoreAccountStorage(snapshot);
      toastApiError(error, 'Failed to disconnect email account.');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
    },
  });
};

export const useSendConnectedEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendConnectedEmailPayload) => emailApi.sendMessage(payload),
    onSuccess: async (_result, payload) => {
      await queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) });
      await queryClient.invalidateQueries({ queryKey: emailKeys.folders(payload.accountId) });
      toast.success('Email sent.');
    },
    onError: (error) => toastApiError(error, 'Failed to send email.'),
  });
};

export const useReplyConnectedEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReplyConnectedEmailPayload) => emailApi.replyMessage(payload),
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
        queryClient.invalidateQueries({ queryKey: emailKeys.conversationRoot(payload.accountId) }),
      ]);
      toast.success('Reply sent.');
    },
    onError: (error) => toastApiError(error, 'Failed to send reply.'),
  });
};

export const useCreateEmailFolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { accountId: string; name: string; parentId?: string }) =>
      emailApi.createFolder(payload.accountId, { name: payload.name, parentId: payload.parentId }),
    onSuccess: async (_folder: ConnectedEmailFolder, payload) => {
      await queryClient.invalidateQueries({ queryKey: emailKeys.folders(payload.accountId) });
      toast.success('Folder created.');
    },
    onError: (error) => toastApiError(error, 'Failed to create folder.'),
  });
};

export const useCreateEmailTagMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { accountId: string; name: string; color?: string }) =>
      emailApi.createTag(payload.accountId, { name: payload.name, color: payload.color }),
    onSuccess: async (_tag: ConnectedEmailTag, payload) => {
      await queryClient.invalidateQueries({ queryKey: emailKeys.tags(payload.accountId) });
      toast.success('Tag created.');
    },
    onError: (error) => toastApiError(error, 'Failed to create tag.'),
  });
};

type EmailActionSnapshot = {
  messages: Array<[QueryKey, EmailMessagePage | undefined]>;
  folders: ConnectedEmailFolder[] | undefined;
};

type OptimisticEmailActionPayload = {
  accountId: string;
  messageId: string;
  targetFolderId?: string | null;
};

function getMessageQuerySnapshots(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string
) {
  return queryClient.getQueriesData<EmailMessagePage>({
    queryKey: emailKeys.messagesRoot(accountId),
  });
}

function findCachedMessage(
  snapshots: Array<[QueryKey, EmailMessagePage | undefined]>,
  messageId: string
) {
  for (const [, page] of snapshots) {
    const message = page?.records.find((item) => item.id === messageId);
    if (message) return message;
  }
  return null;
}

function removeMessageFromCachedLists(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: Array<[QueryKey, EmailMessagePage | undefined]>,
  messageId: string
) {
  for (const [queryKey, page] of snapshots) {
    if (!page) continue;
    queryClient.setQueryData<EmailMessagePage>(queryKey, {
      ...page,
      records: page.records.filter((message) => message.id !== messageId),
    });
  }
}

function putMessageInCachedFolder(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: Array<[QueryKey, EmailMessagePage | undefined]>,
  folderId: string | null | undefined,
  message: ConnectedEmailListItem | null
) {
  if (!folderId || !message) return;
  const movedMessage = { ...message, folderId, folder: folderId };
  for (const [queryKey, page] of snapshots) {
    if (!page || queryKey[3] !== folderId) continue;
    queryClient.setQueryData<EmailMessagePage>(queryKey, (current) => {
      if (!current || current.records.some((item) => item.id === movedMessage.id)) return current;
      return { ...current, records: [movedMessage, ...current.records] };
    });
  }
}

function updateFolderCounts(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string,
  sourceFolderId: string | null | undefined,
  targetFolderId: string | null | undefined
) {
  if (!sourceFolderId && !targetFolderId) return;

  queryClient.setQueryData<ConnectedEmailFolder[]>(emailKeys.folders(accountId), (folders) =>
    folders?.map((folder) => {
      if (folder.id === sourceFolderId && folder.id !== targetFolderId) {
        return { ...folder, totalCount: Math.max(0, folder.totalCount - 1) };
      }
      if (folder.id === targetFolderId && folder.id !== sourceFolderId) {
        return { ...folder, totalCount: folder.totalCount + 1 };
      }
      return folder;
    })
  );
}

async function applyOptimisticEmailMove(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: OptimisticEmailActionPayload
): Promise<EmailActionSnapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
    queryClient.cancelQueries({ queryKey: emailKeys.folders(payload.accountId) }),
    queryClient.cancelQueries({ queryKey: emailKeys.conversationRoot(payload.accountId) }),
  ]);

  const messages = getMessageQuerySnapshots(queryClient, payload.accountId);
  const folders = queryClient.getQueryData<ConnectedEmailFolder[]>(
    emailKeys.folders(payload.accountId)
  );
  const movedMessage = findCachedMessage(messages, payload.messageId);
  const sourceFolderId = movedMessage?.folderId ?? null;

  removeMessageFromCachedLists(queryClient, messages, payload.messageId);
  putMessageInCachedFolder(queryClient, messages, payload.targetFolderId, movedMessage);
  updateFolderCounts(queryClient, payload.accountId, sourceFolderId, payload.targetFolderId);

  return { messages, folders };
}

function rollbackOptimisticEmailAction(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string,
  snapshot: EmailActionSnapshot | undefined
) {
  if (!snapshot) return;
  for (const [queryKey, messages] of snapshot.messages) {
    queryClient.setQueryData(queryKey, messages);
  }
  queryClient.setQueryData(emailKeys.folders(accountId), snapshot.folders);
}

async function refreshEmailActionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: emailKeys.messagesRoot(accountId),
      refetchType: 'active',
    }),
    queryClient.invalidateQueries({
      queryKey: emailKeys.folders(accountId),
      refetchType: 'active',
    }),
    queryClient.invalidateQueries({
      queryKey: emailKeys.conversationRoot(accountId),
      refetchType: 'active',
    }),
  ]);
}

export const useMoveEmailMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { accountId: string; messageId: string; folderId: string }) =>
      emailApi.moveMessage(payload.accountId, payload.messageId, payload.folderId),
    onMutate: (payload) =>
      applyOptimisticEmailMove(queryClient, {
        accountId: payload.accountId,
        messageId: payload.messageId,
        targetFolderId: payload.folderId,
      }),
    onSuccess: () => toast.success('Email moved.'),
    onError: (error, payload, snapshot) => {
      rollbackOptimisticEmailAction(queryClient, payload.accountId, snapshot);
      toastApiError(error, 'Failed to move email.');
    },
    onSettled: async (_result, _error, payload) => {
      await refreshEmailActionQueries(queryClient, payload.accountId);
    },
  });
};

export const useArchiveEmailMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      accountId: string;
      messageId: string;
      targetFolderId?: string | null;
    }) => emailApi.archiveMessage(payload.accountId, payload.messageId),
    onMutate: (payload) =>
      applyOptimisticEmailMove(queryClient, {
        accountId: payload.accountId,
        messageId: payload.messageId,
        targetFolderId: payload.targetFolderId,
      }),
    onSuccess: () => toast.success('Email archived.'),
    onError: (error, payload, snapshot) => {
      rollbackOptimisticEmailAction(queryClient, payload.accountId, snapshot);
      toastApiError(error, 'Failed to archive email.');
    },
    onSettled: async (_result, _error, payload) => {
      await refreshEmailActionQueries(queryClient, payload.accountId);
    },
  });
};

export const useUnarchiveEmailMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      accountId: string;
      messageId: string;
      targetFolderId?: string | null;
    }) => emailApi.unarchiveMessage(payload.accountId, payload.messageId),
    onMutate: (payload) =>
      applyOptimisticEmailMove(queryClient, {
        accountId: payload.accountId,
        messageId: payload.messageId,
        targetFolderId: payload.targetFolderId,
      }),
    onSuccess: () => toast.success('Email unarchived.'),
    onError: (error, payload, snapshot) => {
      rollbackOptimisticEmailAction(queryClient, payload.accountId, snapshot);
      toastApiError(error, 'Failed to unarchive email.');
    },
    onSettled: async (_result, _error, payload) => {
      await refreshEmailActionQueries(queryClient, payload.accountId);
    },
  });
};

export const useDeleteEmailMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      accountId: string;
      messageId: string;
      targetFolderId?: string | null;
    }) => emailApi.deleteMessage(payload.accountId, payload.messageId),
    onSuccess: async (_result, payload) => {
      toast.success('Email moved to deleted items.');
      await refreshEmailActionQueries(queryClient, payload.accountId);
    },
    onError: (error) => toastApiError(error, 'Failed to delete email.'),
  });
};

export const useUpdateEmailMessageTagsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      accountId: string;
      messageId: string;
      add?: string[];
      remove?: string[];
    }) =>
      emailApi.updateMessageTags(payload.accountId, payload.messageId, {
        add: payload.add,
        remove: payload.remove,
      }),
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
        queryClient.invalidateQueries({ queryKey: emailKeys.conversationRoot(payload.accountId) }),
        queryClient.invalidateQueries({ queryKey: emailKeys.tags(payload.accountId) }),
      ]);
      toast.success('Tags updated.');
    },
    onError: (error) => toastApiError(error, 'Failed to update tags.'),
  });
};

type EmailStatusPayload = {
  accountId: string;
  messageId: string;
  unread: boolean;
};

type EmailMessagePages = InfiniteData<EmailMessagePage, string | null>;

type EmailStatusSnapshot = {
  messages: Array<[QueryKey, EmailMessagePages | undefined]>;
  folders: ConnectedEmailFolder[] | undefined;
  message: ConnectedEmailListItem | undefined;
};

function findMessageInPages(
  messages: Array<[QueryKey, EmailMessagePages | undefined]>,
  messageId: string
) {
  for (const [, data] of messages) {
    for (const page of data?.pages ?? []) {
      const message = page.records.find((item) => item.id === messageId);
      if (message) return message;
    }
  }
  return undefined;
}

export const useUpdateEmailMessageStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmailStatusPayload) =>
      emailApi.updateMessageStatus(payload.accountId, payload.messageId, {
        unread: payload.unread,
      }),
    onMutate: async (payload): Promise<EmailStatusSnapshot> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
        queryClient.cancelQueries({ queryKey: emailKeys.folders(payload.accountId) }),
        queryClient.cancelQueries({
          queryKey: emailKeys.message(payload.accountId, payload.messageId),
        }),
      ]);

      const messages = queryClient.getQueriesData<EmailMessagePages>({
        queryKey: emailKeys.messagesRoot(payload.accountId),
      });
      const folders = queryClient.getQueryData<ConnectedEmailFolder[]>(
        emailKeys.folders(payload.accountId)
      );
      const message = queryClient.getQueryData<ConnectedEmailListItem>(
        emailKeys.message(payload.accountId, payload.messageId)
      );
      const cachedMessage = findMessageInPages(messages, payload.messageId) ?? message;
      const unreadDelta =
        cachedMessage && cachedMessage.unread !== payload.unread ? (payload.unread ? 1 : -1) : 0;

      queryClient.setQueriesData<EmailMessagePages>(
        { queryKey: emailKeys.messagesRoot(payload.accountId) },
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  records: page.records.map((item) =>
                    item.id === payload.messageId ? { ...item, unread: payload.unread } : item
                  ),
                })),
              }
            : current
      );

      queryClient.setQueryData<ConnectedEmailListItem>(
        emailKeys.message(payload.accountId, payload.messageId),
        (current) => (current ? { ...current, unread: payload.unread } : current)
      );

      if (cachedMessage?.folderId && unreadDelta !== 0) {
        queryClient.setQueryData<ConnectedEmailFolder[]>(
          emailKeys.folders(payload.accountId),
          (current) =>
            current?.map((folder) =>
              folder.id === cachedMessage.folderId
                ? {
                    ...folder,
                    unreadCount: Math.max(0, folder.unreadCount + unreadDelta),
                  }
                : folder
            )
        );
      }

      return { messages, folders, message };
    },
    onSuccess: (_result, payload) => {
      if (payload.unread) toast.success('Email marked as unread.');
    },
    onError: (error, payload, snapshot) => {
      for (const [queryKey, messages] of snapshot?.messages ?? []) {
        queryClient.setQueryData(queryKey, messages);
      }
      queryClient.setQueryData(emailKeys.folders(payload.accountId), snapshot?.folders);
      queryClient.setQueryData(
        emailKeys.message(payload.accountId, payload.messageId),
        snapshot?.message
      );
      toastApiError(
        error,
        payload.unread ? 'Failed to mark email as unread.' : 'Failed to mark email as read.'
      );
    },
    onSettled: async (_result, _error, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: emailKeys.messagesRoot(payload.accountId),
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: emailKeys.folders(payload.accountId),
          refetchType: 'active',
        }),
      ]);
    },
  });
};
