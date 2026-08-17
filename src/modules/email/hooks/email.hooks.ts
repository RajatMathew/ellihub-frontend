import { activityLogKeys } from '@/app/hooks/activity-log.keys';
import { toastApiError } from '@/app/lib/toast-api-error';
import {
  emailApi,
  type ConnectedEmailFolder,
  type ConnectedEmailListItem,
  type ConnectedEmailTag,
  type EmailAccount,
  type EmailConfig,
  type EmailDraftMessagePayload,
  type EmailMeetingResponseAction,
  type EmailMessagePage,
  type EmailReferenceProject,
  type EmailThreadClassification,
  type ReplyConnectedEmailPayload,
  type SaveEmailThreadClassificationPayload,
  type SendConnectedEmailPayload,
  type StartEmailAuthInput,
  type UpdateEmailAccountNicknameInput,
} from '@/modules/email/api';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import {
  isEmailReconnectRequiredError,
  shouldRetryEmailRequest,
} from '@/modules/email/lib/email-errors';
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
  config: () => [...emailKeys.all, 'config'] as const,
  accounts: () => [...emailKeys.all, 'accounts'] as const,
  folders: (accountId?: string) => [...emailKeys.all, 'folders', accountId] as const,
  tags: (accountId?: string) => [...emailKeys.all, 'tags', accountId] as const,
  messagesRoot: (accountId?: string) => [...emailKeys.all, 'messages', accountId] as const,
  messages: (
    accountId?: string,
    folder?: string,
    size?: number,
    search?: string,
    projectId?: string,
    classification?: 'other'
  ) =>
    [
      ...emailKeys.messagesRoot(accountId),
      folder,
      size,
      search,
      projectId ?? null,
      classification ?? null,
    ] as const,
  message: (accountId?: string, messageId?: string | null) =>
    [...emailKeys.all, 'message', accountId, messageId] as const,
  conversationRoot: (accountId?: string) => [...emailKeys.all, 'conversation', accountId] as const,
  conversation: (accountId?: string, threadId?: string | null) =>
    [...emailKeys.conversationRoot(accountId), threadId] as const,
  referenceProjects: (accountId?: string) =>
    [...emailKeys.all, 'reference-projects', accountId] as const,
};

export const useEmailConfigQuery = () =>
  useQuery<EmailConfig>({
    queryKey: emailKeys.config(),
    queryFn: emailApi.getConfig,
    staleTime: EMAIL_METADATA_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

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

export const useEmailFoldersQuery = (accountId?: string, enabled = true) =>
  useQuery({
    queryKey: emailKeys.folders(accountId),
    queryFn: () => emailApi.listFolders(accountId!),
    enabled: enabled && Boolean(accountId),
    staleTime: EMAIL_METADATA_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    retry: shouldRetryEmailRequest,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useEmailTagsQuery = (accountId?: string, enabled = true) =>
  useQuery({
    queryKey: emailKeys.tags(accountId),
    queryFn: () => emailApi.listTags(accountId!),
    enabled: enabled && Boolean(accountId),
    staleTime: EMAIL_METADATA_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    retry: shouldRetryEmailRequest,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useEmailMessagesQuery = (
  accountId: string | undefined,
  folder: { key?: EmailFolderKey; id?: string },
  pagination?: { size?: number; search?: string; projectId?: string; classification?: 'other' },
  enabled = true
) => {
  const currentKey = emailKeys.messages(
    accountId,
    folder.id ?? folder.key,
    pagination?.size,
    pagination?.search,
    pagination?.projectId,
    pagination?.classification
  );

  return useInfiniteQuery({
    queryKey: currentKey,
    queryFn: ({ pageParam, signal }) =>
      emailApi.listMessages({
        accountId: accountId!,
        folderKey: folder.key,
        folderId: folder.id,
        pageToken: pageParam ?? undefined,
        size: pagination?.size,
        search: pagination?.search,
        projectId: pagination?.projectId,
        classification: pagination?.classification,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    enabled: enabled && Boolean(accountId),
    staleTime: EMAIL_MESSAGES_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    // Keep the previous list on smooth transitions (search debounce, page-size
    // changes) but clear immediately on hard context switches (account, folder,
    // project filter, classification). Prevents the "ghost mailbox" flash when
    // a user picks a different inbox in the sidebar.
    placeholderData: (previousData, previousQuery) => {
      if (!previousData || !previousQuery) return undefined;
      const previousKey = previousQuery.queryKey as readonly unknown[];
      const sameAccount = previousKey[2] === currentKey[2];
      const sameFolder = previousKey[3] === currentKey[3];
      const sameProject = previousKey[6] === currentKey[6];
      const sameClassification = previousKey[7] === currentKey[7];
      return sameAccount && sameFolder && sameProject && sameClassification
        ? previousData
        : undefined;
    },
    retry: shouldRetryEmailRequest,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useEmailReferenceProjectsQuery = (accountId?: string, enabled = true) =>
  useQuery<EmailReferenceProject[]>({
    queryKey: emailKeys.referenceProjects(accountId),
    queryFn: () => emailApi.listReferenceProjects(accountId!),
    enabled: enabled && Boolean(accountId),
    staleTime: EMAIL_METADATA_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    retry: shouldRetryEmailRequest,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export const useRefreshEmailMessagesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { accountId: string; daysWithin?: number }) => {
      let result = await emailApi.syncAccount(payload.accountId, payload.daysWithin);
      let steps = 0;
      while (result.hasMore && steps < 1000) {
        steps += 1;
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        result = await emailApi.syncAccount(payload.accountId, payload.daysWithin);
      }
      return result;
    },
    onSuccess: (result, payload) => {
      void Promise.allSettled([
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
      if (result.hasMore) toast.info('Email sync is still in progress. Refresh to continue.');
    },
    onError: (error) => {
      if (isEmailReconnectRequiredError(error)) return;
      toastApiError(error, 'Failed to refresh emails.');
    },
  });
};

export const useEmailConversationQuery = (
  accountId: string | undefined,
  threadId: string | null | undefined,
  enabled = true
) =>
  useQuery({
    queryKey: emailKeys.conversation(accountId, threadId),
    queryFn: () => emailApi.listConversation(accountId!, threadId!),
    enabled: enabled && Boolean(accountId && threadId),
    staleTime: EMAIL_MESSAGES_STALE_TIME_MS,
    gcTime: EMAIL_MESSAGES_CACHE_TIME_MS,
    retry: shouldRetryEmailRequest,
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
    retry: shouldRetryEmailRequest,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

type EmailThreadClassificationSnapshot = {
  messages: Array<[QueryKey, EmailMessagePages | undefined]>;
  message: ConnectedEmailListItem | undefined;
};

function applyClassificationToMessagePages(
  data: EmailMessagePages | undefined,
  conversationKey: string,
  classification: EmailThreadClassification
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      records: page.records.map((message) =>
        message.conversationKey === conversationKey ? { ...message, classification } : message
      ),
    })),
  };
}

function normalizeClassificationReferences(
  references: EmailThreadClassification['references']
): EmailThreadClassification['references'] {
  const seenReferences = new Set<string>();
  const uniqueReferences: EmailThreadClassification['references'] = [];

  for (const reference of references) {
    if (reference.type === 'other') return [{ ...reference, sortOrder: 0 }];
    const valueKey = reference.entityId
      ? `id:${reference.entityId}`
      : `label:${reference.label.toLowerCase()}`;
    const key = [reference.type, reference.entityType ?? '', valueKey].join('|');
    if (seenReferences.has(key)) continue;
    seenReferences.add(key);
    uniqueReferences.push(reference);
  }

  return uniqueReferences.map((reference, index) => ({ ...reference, sortOrder: index }));
}

export const useSaveEmailThreadClassificationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveEmailThreadClassificationPayload) =>
      emailApi.saveThreadClassification(payload),
    onMutate: async (payload): Promise<EmailThreadClassificationSnapshot> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
        queryClient.cancelQueries({ queryKey: emailKeys.message(payload.accountId, undefined) }),
      ]);

      const optimisticClassification: EmailThreadClassification = {
        id: null,
        conversationKey: payload.conversationKey,
        threadId: payload.threadId ?? null,
        status: payload.status,
        references: normalizeClassificationReferences(payload.references),
      };
      const messages = queryClient.getQueriesData<EmailMessagePages>({
        queryKey: emailKeys.messagesRoot(payload.accountId),
      });
      const message = queryClient.getQueryData<ConnectedEmailListItem>(
        emailKeys.message(payload.accountId, payload.threadId ?? null)
      );

      queryClient.setQueriesData<EmailMessagePages>(
        { queryKey: emailKeys.messagesRoot(payload.accountId) },
        (current) =>
          applyClassificationToMessagePages(
            current,
            payload.conversationKey,
            optimisticClassification
          )
      );
      queryClient.setQueriesData<ConnectedEmailListItem>({ queryKey: emailKeys.all }, (current) =>
        current?.conversationKey === payload.conversationKey
          ? { ...current, classification: optimisticClassification }
          : current
      );

      return { messages, message };
    },
    onSuccess: (classification, payload) => {
      queryClient.setQueriesData<EmailMessagePages>(
        { queryKey: emailKeys.messagesRoot(payload.accountId) },
        (current) =>
          applyClassificationToMessagePages(current, payload.conversationKey, classification)
      );
      queryClient.setQueriesData<ConnectedEmailListItem>({ queryKey: emailKeys.all }, (current) =>
        current?.conversationKey === payload.conversationKey
          ? { ...current, classification }
          : current
      );
      void queryClient.invalidateQueries({
        queryKey: emailKeys.referenceProjects(payload.accountId),
      });
      void queryClient.invalidateQueries({ queryKey: activityLogKeys.all });
    },
    onError: (error, payload, snapshot) => {
      for (const [queryKey, messages] of snapshot?.messages ?? []) {
        queryClient.setQueryData(queryKey, messages);
      }
      if (snapshot?.message) {
        queryClient.setQueryData(
          emailKeys.message(payload.accountId, payload.threadId),
          snapshot.message
        );
      }
      toastApiError(error, 'Unable to save email references.');
    },
    onSettled: (_result, _error, payload) => {
      void queryClient.invalidateQueries({
        queryKey: emailKeys.messagesRoot(payload.accountId),
        refetchType: 'active',
      });
    },
  });
};

export const useStartEmailAuthMutation = () =>
  useMutation({
    mutationFn: (input: StartEmailAuthInput) => emailApi.startAuth(input),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
    onError: (error) => toastApiError(error, 'Unable to start email account connection.'),
  });

export const useUpdateEmailAccountNicknameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateEmailAccountNicknameInput) => emailApi.updateAccountNickname(input),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData<EmailAccount[]>(emailKeys.accounts(), (accounts) =>
        accounts?.map((account) => (account.id === updatedAccount.id ? updatedAccount : account))
      );
      toast.success('Email name saved.');
    },
    onError: (error) => toastApiError(error, 'Unable to save this email name.'),
  });
};

type DisconnectAccountSnapshot = {
  accounts: EmailAccount[] | undefined;
};

export const useDisconnectEmailAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { accountId: string }) => emailApi.disconnectAccount(payload.accountId),
    onMutate: async (payload): Promise<DisconnectAccountSnapshot> => {
      await queryClient.cancelQueries({ queryKey: emailKeys.accounts() });

      const accounts = queryClient.getQueryData<EmailAccount[]>(emailKeys.accounts());
      const nextAccounts = accounts?.filter((account) => account.id !== payload.accountId);
      const snapshot = { accounts };

      if (nextAccounts) {
        queryClient.setQueryData<EmailAccount[]>(emailKeys.accounts(), nextAccounts);
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
    onSuccess: (_result, payload) => {
      toast.success('Email sent.');

      // Sending is complete once the provider accepts the message. Keep cache
      // reconciliation in the background so a slow mailbox fetch cannot leave
      // the composer stuck in its sending state.
      void Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: emailKeys.messagesRoot(payload.accountId),
          refetchType: 'none',
        }),
        queryClient.invalidateQueries({
          queryKey: emailKeys.folders(payload.accountId),
          refetchType: 'none',
        }),
      ]).then(() =>
        Promise.allSettled([
          queryClient.refetchQueries({
            queryKey: emailKeys.messagesRoot(payload.accountId),
            type: 'active',
          }),
          queryClient.refetchQueries({
            queryKey: emailKeys.folders(payload.accountId),
            type: 'active',
          }),
        ])
      );
    },
    onError: (error) => toastApiError(error, 'Failed to send email.'),
  });
};

export const useOpenEmailDraftMutation = () =>
  useMutation({
    mutationFn: (payload: { accountId: string; messageId: string }) =>
      emailApi.getDraft(payload.accountId, payload.messageId),
    onError: (error) => toastApiError(error, 'Failed to open draft.'),
  });

type EmailMessagePages = InfiniteData<EmailMessagePage, string | null>;

type SendDraftPayload = {
  accountId: string;
  draftId: string;
  messageId?: string;
};

type SendDraftSnapshot = {
  messages: Array<[QueryKey, EmailMessagePages | undefined]>;
  folders: ConnectedEmailFolder[] | undefined;
};

function isSentDraft(
  message: ConnectedEmailListItem,
  payload: Pick<SendDraftPayload, 'draftId' | 'messageId'>
) {
  return (
    message.id === payload.messageId ||
    message.providerId === payload.messageId ||
    message.providerId === payload.draftId
  );
}

export const useSaveEmailDraftMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmailDraftMessagePayload) => emailApi.saveDraft(payload),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({
        queryKey: emailKeys.messagesRoot(payload.accountId),
        refetchType: 'none',
      });
      void queryClient.invalidateQueries({
        queryKey: emailKeys.folders(payload.accountId),
        refetchType: 'none',
      });
    },
  });
};

export const useSendEmailDraftMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendDraftPayload) => emailApi.sendDraft(payload),
    onMutate: async (payload): Promise<SendDraftSnapshot> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
        queryClient.cancelQueries({ queryKey: emailKeys.folders(payload.accountId) }),
      ]);

      const messages = queryClient.getQueriesData<EmailMessagePages>({
        queryKey: emailKeys.messagesRoot(payload.accountId),
      });
      const folders = queryClient.getQueryData<ConnectedEmailFolder[]>(
        emailKeys.folders(payload.accountId)
      );
      const hadCachedDraft = messages.some(([, data]) =>
        data?.pages.some((page) => page.records.some((message) => isSentDraft(message, payload)))
      );

      queryClient.setQueriesData<EmailMessagePages>(
        { queryKey: emailKeys.messagesRoot(payload.accountId) },
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  records: page.records.filter((message) => !isSentDraft(message, payload)),
                  totalCount:
                    page.totalCount === null || page.totalCount === undefined || !hadCachedDraft
                      ? page.totalCount
                      : Math.max(0, page.totalCount - 1),
                })),
              }
            : current
      );

      if (hadCachedDraft) {
        queryClient.setQueryData<ConnectedEmailFolder[]>(
          emailKeys.folders(payload.accountId),
          (current) =>
            current?.map((folder) =>
              folder.key === 'drafts'
                ? { ...folder, totalCount: Math.max(0, folder.totalCount - 1) }
                : folder
            )
        );
      }

      return { messages, folders };
    },
    onSuccess: (_result, _payload) => {
      toast.success('Email sent.');
    },
    onError: (error, payload, snapshot) => {
      for (const [queryKey, messages] of snapshot?.messages ?? []) {
        queryClient.setQueryData(queryKey, messages);
      }
      queryClient.setQueryData(emailKeys.folders(payload.accountId), snapshot?.folders);
      toastApiError(error, 'Failed to send email.');
    },
    onSettled: (_result, _error, payload) => {
      void Promise.allSettled([
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

export const useDeleteEmailDraftMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      accountId: string;
      draftId: string;
      messageId?: string;
      silent?: boolean;
    }) => emailApi.deleteDraft(payload.accountId, payload.draftId, payload.messageId),
    onSuccess: (_result, payload) => {
      void queryClient.invalidateQueries({
        queryKey: emailKeys.messagesRoot(payload.accountId),
        refetchType: 'none',
      });
      void queryClient.invalidateQueries({
        queryKey: emailKeys.folders(payload.accountId),
        refetchType: 'none',
      });
      if (!payload.silent) toast.success('Draft discarded.');
    },
    onError: (error) => toastApiError(error, 'Failed to discard draft.'),
  });
};

export const useReplyConnectedEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReplyConnectedEmailPayload) => emailApi.replyMessage(payload),
    onSuccess: (_result, payload) => {
      void Promise.allSettled([
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
    mutationFn: (payload: {
      accountId: string;
      name: string;
      color?: string;
      messageId?: string;
    }) => emailApi.createTag(payload.accountId, { name: payload.name, color: payload.color }),
    onSuccess: async (tag: ConnectedEmailTag, payload) => {
      if (payload.messageId) {
        await emailApi.updateMessageTags(payload.accountId, payload.messageId, {
          add: [tag.providerId],
          remove: [],
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: emailKeys.tags(payload.accountId) }),
        queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
        queryClient.invalidateQueries({ queryKey: emailKeys.conversationRoot(payload.accountId) }),
      ]);
      toast.success(payload.messageId ? 'Tag created and applied.' : 'Tag created.');
    },
    onError: (error) => toastApiError(error, 'Failed to create tag.'),
  });
};

type EmailActionSnapshot = {
  messages: Array<[QueryKey, EmailMessagePages | undefined]>;
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
  return queryClient.getQueriesData<EmailMessagePages>({
    queryKey: emailKeys.messagesRoot(accountId),
  });
}

function findCachedMessage(
  snapshots: Array<[QueryKey, EmailMessagePages | undefined]>,
  messageId: string
) {
  for (const [, data] of snapshots) {
    for (const page of data?.pages ?? []) {
      const message = page.records.find((item) => item.id === messageId);
      if (message) return message;
    }
  }
  return null;
}

function removeMessageFromCachedLists(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: Array<[QueryKey, EmailMessagePages | undefined]>,
  messageId: string
) {
  for (const [queryKey] of snapshots) {
    queryClient.setQueryData<EmailMessagePages>(queryKey, (current) => {
      if (!current) return current;
      const containsMessage = current.pages.some((page) =>
        page.records.some((message) => message.id === messageId)
      );
      if (!containsMessage) return current;

      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          records: page.records.filter((message) => message.id !== messageId),
          totalCount:
            page.totalCount === null || page.totalCount === undefined
              ? page.totalCount
              : Math.max(0, page.totalCount - 1),
        })),
      };
    });
  }
}

function putMessageInCachedFolder(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: Array<[QueryKey, EmailMessagePages | undefined]>,
  folderId: string | null | undefined,
  message: ConnectedEmailListItem | null
) {
  if (!folderId || !message) return;
  const movedMessage: ConnectedEmailListItem = { ...message, folderId, folder: folderId };
  for (const [queryKey] of snapshots) {
    if (queryKey[3] !== folderId) continue;
    queryClient.setQueryData<EmailMessagePages>(queryKey, (current) => {
      if (
        !current ||
        current.pages.some((page) => page.records.some((item) => item.id === movedMessage.id))
      ) {
        return current;
      }

      return {
        ...current,
        pages: current.pages.map((page, index) => ({
          ...page,
          records: index === 0 ? [movedMessage, ...page.records] : page.records,
          totalCount:
            page.totalCount === null || page.totalCount === undefined
              ? page.totalCount
              : page.totalCount + 1,
        })),
      };
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
    onMutate: (payload) =>
      applyOptimisticEmailMove(queryClient, {
        accountId: payload.accountId,
        messageId: payload.messageId,
        targetFolderId: payload.targetFolderId,
      }),
    onSuccess: () => {
      toast.success('Email moved to deleted items.');
    },
    onError: (error, payload, snapshot) => {
      rollbackOptimisticEmailAction(queryClient, payload.accountId, snapshot);
      toastApiError(error, 'Failed to delete email.');
    },
    onSettled: async (_result, _error, payload) => {
      await refreshEmailActionQueries(queryClient, payload.accountId);
    },
  });
};

type EmailTagsSnapshot = Array<[QueryKey, EmailMessagePages | undefined]>;

async function applyOptimisticEmailTags(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: { accountId: string; messageId: string; add?: string[]; remove?: string[] }
): Promise<EmailTagsSnapshot> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
    queryClient.cancelQueries({ queryKey: emailKeys.conversationRoot(payload.accountId) }),
  ]);

  const snapshots = getMessageQuerySnapshots(queryClient, payload.accountId);
  const add = new Set(payload.add ?? []);
  const remove = new Set(payload.remove ?? []);
  queryClient.setQueriesData<EmailMessagePages>(
    { queryKey: emailKeys.messagesRoot(payload.accountId) },
    (current) =>
      current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              records: page.records.map((message) => {
                if (message.id !== payload.messageId && message.providerId !== payload.messageId) {
                  return message;
                }
                const keywords = new Set(message.keywords ?? []);
                remove.forEach((keyword) => keywords.delete(keyword));
                add.forEach((keyword) => keywords.add(keyword));
                return { ...message, keywords: Array.from(keywords) };
              }),
            })),
          }
        : current
  );
  return snapshots;
}

export const usePermanentlyDeleteEmailMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { accountId: string; messageId: string }) =>
      emailApi.permanentlyDeleteMessage(payload.accountId, payload.messageId),
    onSuccess: async (_result, payload) => {
      toast.success('Email permanently deleted.');
      await refreshEmailActionQueries(queryClient, payload.accountId);
    },
    onError: (error) => toastApiError(error, 'Failed to permanently delete email.'),
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
    onMutate: (payload) => applyOptimisticEmailTags(queryClient, payload),
    onSuccess: async (_result, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) }),
        queryClient.invalidateQueries({ queryKey: emailKeys.conversationRoot(payload.accountId) }),
        queryClient.invalidateQueries({ queryKey: emailKeys.tags(payload.accountId) }),
      ]);
      toast.success('Tags updated.');
    },
    onError: (error, _payload, snapshot) => {
      for (const [queryKey, messages] of snapshot ?? []) {
        queryClient.setQueryData(queryKey, messages);
      }
      toastApiError(error, 'Failed to update tags.');
    },
  });
};

type EmailStatusPayload = {
  accountId: string;
  messageId: string;
  conversationKey?: string;
  threadId?: string;
  unread: boolean;
};

type EmailStatusSnapshot = {
  messages: Array<{
    queryKey: QueryKey;
    items: Array<{ id: string; unread: boolean }>;
  }>;
  folderId?: string | null;
  unreadDelta: number;
  messageUnread?: boolean;
};

const EMAIL_STATUS_MUTATION_KEY = [...emailKeys.all, 'message-status'] as const;

function isEmailStatusTarget(item: ConnectedEmailListItem, payload: EmailStatusPayload) {
  return (
    item.id === payload.messageId ||
    Boolean(
      payload.conversationKey &&
      (item.conversationKey === payload.conversationKey ||
        item.threadId === payload.conversationKey)
    )
  );
}

function findMessageInPages(
  messages: Array<[QueryKey, EmailMessagePages | undefined]>,
  payload: EmailStatusPayload
) {
  for (const [, data] of messages) {
    for (const page of data?.pages ?? []) {
      const message = page.records.find((item) => item.id === payload.messageId);
      if (message) return message;
    }
  }

  for (const [, data] of messages) {
    for (const page of data?.pages ?? []) {
      const message = page.records.find((item) => isEmailStatusTarget(item, payload));
      if (message) return message;
    }
  }
  return undefined;
}

function updateMessageStatusInPages(
  current: EmailMessagePages | undefined,
  payload: EmailStatusPayload
) {
  return current
    ? {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          records: page.records.map((item) =>
            isEmailStatusTarget(item, payload) ? { ...item, unread: payload.unread } : item
          ),
        })),
      }
    : current;
}

export const useUpdateEmailMessageStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: EMAIL_STATUS_MUTATION_KEY,
    mutationFn: async (payload: EmailStatusPayload) => {
      if (!payload.unread && payload.threadId) {
        await queryClient.ensureQueryData({
          queryKey: emailKeys.conversation(payload.accountId, payload.threadId),
          queryFn: () => emailApi.listConversation(payload.accountId, payload.threadId!),
          staleTime: EMAIL_MESSAGES_STALE_TIME_MS,
        });
      }
      return emailApi.updateMessageStatus(payload.accountId, payload.messageId, {
        unread: payload.unread,
      });
    },
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
      const message = queryClient.getQueryData<ConnectedEmailListItem>(
        emailKeys.message(payload.accountId, payload.messageId)
      );
      const cachedMessage = findMessageInPages(messages, payload) ?? message;
      const unreadDelta =
        cachedMessage && cachedMessage.unread !== payload.unread ? (payload.unread ? 1 : -1) : 0;
      const messageSnapshots = messages.map(([queryKey, data]) => ({
        queryKey,
        items: (data?.pages ?? []).flatMap((page) =>
          page.records
            .filter((item) => isEmailStatusTarget(item, payload))
            .map((item) => ({ id: item.id, unread: item.unread }))
        ),
      }));

      queryClient.setQueriesData<EmailMessagePages>(
        { queryKey: emailKeys.messagesRoot(payload.accountId) },
        (current) => updateMessageStatusInPages(current, payload)
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

      return {
        messages: messageSnapshots,
        folderId: cachedMessage?.folderId,
        unreadDelta,
        messageUnread: message?.unread,
      };
    },
    onSuccess: (_result, payload) => {
      queryClient.setQueriesData<EmailMessagePages>(
        { queryKey: emailKeys.messagesRoot(payload.accountId) },
        (current) => updateMessageStatusInPages(current, payload)
      );
      queryClient.setQueryData<ConnectedEmailListItem>(
        emailKeys.message(payload.accountId, payload.messageId),
        (current) => (current ? { ...current, unread: payload.unread } : current)
      );
      if (payload.unread) toast.success('Email marked as unread.');
    },
    onError: (error, payload, snapshot) => {
      for (const { queryKey, items } of snapshot?.messages ?? []) {
        const unreadById = new Map(items.map((item) => [item.id, item.unread]));
        queryClient.setQueryData<EmailMessagePages>(queryKey, (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  records: page.records.map((item) =>
                    unreadById.has(item.id) ? { ...item, unread: unreadById.get(item.id)! } : item
                  ),
                })),
              }
            : current
        );
      }
      if (snapshot?.folderId && snapshot.unreadDelta !== 0) {
        queryClient.setQueryData<ConnectedEmailFolder[]>(
          emailKeys.folders(payload.accountId),
          (current) =>
            current?.map((folder) =>
              folder.id === snapshot.folderId
                ? {
                    ...folder,
                    unreadCount: Math.max(0, folder.unreadCount - snapshot.unreadDelta),
                  }
                : folder
            )
        );
      }
      queryClient.setQueryData<ConnectedEmailListItem>(
        emailKeys.message(payload.accountId, payload.messageId),
        (current) =>
          current && snapshot?.messageUnread !== undefined
            ? { ...current, unread: snapshot.messageUnread }
            : current
      );
      toastApiError(
        error,
        payload.unread ? 'Failed to mark email as unread.' : 'Failed to mark email as read.'
      );
    },
    onSettled: async (_result, _error, payload) => {
      const isLastAccountStatusMutation =
        queryClient.isMutating({
          mutationKey: EMAIL_STATUS_MUTATION_KEY,
          predicate: (mutation) =>
            (mutation.state.variables as EmailStatusPayload | undefined)?.accountId ===
            payload.accountId,
        }) <= 1;

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: emailKeys.messagesRoot(payload.accountId),
          refetchType: 'none',
        }),
        queryClient.invalidateQueries({
          queryKey: emailKeys.folders(payload.accountId),
          refetchType: isLastAccountStatusMutation ? 'active' : 'none',
        }),
      ]);
    },
  });
};

const invalidateMeetingQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string
) =>
  Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: emailKeys.conversationRoot(accountId),
      refetchType: 'active',
    }),
    queryClient.invalidateQueries({
      queryKey: emailKeys.messagesRoot(accountId),
      refetchType: 'none',
    }),
  ]);

export const useRespondToEmailMeetingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      accountId: string;
      messageId: string;
      response: EmailMeetingResponseAction;
      comment?: string;
      sendResponse?: boolean;
    }) => emailApi.respondToMeeting(input),
    onSuccess: (_event, input) => {
      void invalidateMeetingQueries(queryClient, input.accountId);
      toast.success(
        input.response === 'accepted'
          ? 'Meeting accepted.'
          : input.response === 'tentative'
            ? 'Meeting marked tentative.'
            : 'Meeting declined.'
      );
    },
    onError: (error) => {
      if (isEmailReconnectRequiredError(error)) return;
      toastApiError(error, 'Unable to update your meeting response.');
    },
  });
};

export const useUpdateEmailMeetingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      accountId: string;
      messageId: string;
      subject?: string;
      startAt?: string;
      endAt?: string;
      location?: string;
    }) => emailApi.updateMeeting(input),
    onSuccess: (_event, input) => {
      void invalidateMeetingQueries(queryClient, input.accountId);
      toast.success('Meeting updated.');
    },
    onError: (error) => {
      if (isEmailReconnectRequiredError(error)) return;
      toastApiError(error, 'Unable to update this meeting.');
    },
  });
};

export const useCancelEmailMeetingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { accountId: string; messageId: string; comment?: string }) =>
      emailApi.cancelMeeting(input),
    onSuccess: (_event, input) => {
      void invalidateMeetingQueries(queryClient, input.accountId);
      toast.success('Meeting cancelled.');
    },
    onError: (error) => {
      if (isEmailReconnectRequiredError(error)) return;
      toastApiError(error, 'Unable to cancel this meeting.');
    },
  });
};
