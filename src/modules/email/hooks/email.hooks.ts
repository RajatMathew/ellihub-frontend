import { toastApiError } from '@/app/lib/toast-api-error';
import {
  emailApi,
  type ConnectedEmailFolder,
  type ConnectedEmailListItem,
  type ConnectedEmailTag,
  type EmailProvider,
  type SendConnectedEmailPayload,
} from '@/modules/email/api';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

export const emailKeys = {
  all: ['connected-email'] as const,
  accounts: () => [...emailKeys.all, 'accounts'] as const,
  folders: (accountId?: string) => [...emailKeys.all, 'folders', accountId] as const,
  tags: (accountId?: string) => [...emailKeys.all, 'tags', accountId] as const,
  messagesRoot: (accountId?: string) => [...emailKeys.all, 'messages', accountId] as const,
  messages: (accountId?: string, folder?: string) =>
    [...emailKeys.messagesRoot(accountId), folder] as const,
  conversationRoot: (accountId?: string) => [...emailKeys.all, 'conversation', accountId] as const,
  conversation: (accountId?: string, threadId?: string | null) =>
    [...emailKeys.conversationRoot(accountId), threadId] as const,
};

export const useEmailAccountsQuery = () =>
  useQuery({
    queryKey: emailKeys.accounts(),
    queryFn: emailApi.listAccounts,
  });

export const useEmailFoldersQuery = (accountId?: string) =>
  useQuery({
    queryKey: emailKeys.folders(accountId),
    queryFn: () => emailApi.listFolders(accountId!),
    enabled: Boolean(accountId),
  });

export const useEmailTagsQuery = (accountId?: string) =>
  useQuery({
    queryKey: emailKeys.tags(accountId),
    queryFn: () => emailApi.listTags(accountId!),
    enabled: Boolean(accountId),
  });

export const useEmailMessagesQuery = (
  accountId: string | undefined,
  folder: { key?: EmailFolderKey; id?: string }
) =>
  useQuery({
    queryKey: emailKeys.messages(accountId, folder.id ?? folder.key),
    queryFn: () =>
      emailApi.listMessages({ accountId: accountId!, folderKey: folder.key, folderId: folder.id }),
    enabled: Boolean(accountId),
  });

export const useEmailConversationQuery = (
  accountId: string | undefined,
  threadId: string | null | undefined
) =>
  useQuery({
    queryKey: emailKeys.conversation(accountId, threadId),
    queryFn: () => emailApi.listConversation(accountId!, threadId!),
    enabled: Boolean(accountId && threadId),
  });

export const useStartEmailAuthMutation = () =>
  useMutation({
    mutationFn: (provider: EmailProvider) => emailApi.startAuth(provider),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
    onError: (error) => toastApiError(error, 'Unable to start email account connection.'),
  });

export const useSendConnectedEmailMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendConnectedEmailPayload) => emailApi.sendMessage(payload),
    onSuccess: async (_result, payload) => {
      await queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(payload.accountId) });
      toast.success('Email sent.');
    },
    onError: (error) => toastApiError(error, 'Failed to send email.'),
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
  messages: Array<[QueryKey, ConnectedEmailListItem[] | undefined]>;
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
  return queryClient.getQueriesData<ConnectedEmailListItem[]>({
    queryKey: emailKeys.messagesRoot(accountId),
  });
}

function findCachedMessage(
  snapshots: Array<[QueryKey, ConnectedEmailListItem[] | undefined]>,
  messageId: string
) {
  for (const [, messages] of snapshots) {
    const message = messages?.find((item) => item.id === messageId);
    if (message) return message;
  }
  return null;
}

function removeMessageFromCachedLists(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: Array<[QueryKey, ConnectedEmailListItem[] | undefined]>,
  messageId: string
) {
  for (const [queryKey, messages] of snapshots) {
    if (!messages) continue;
    queryClient.setQueryData<ConnectedEmailListItem[]>(
      queryKey,
      messages.filter((message) => message.id !== messageId)
    );
  }
}

function putMessageInCachedFolder(
  queryClient: ReturnType<typeof useQueryClient>,
  accountId: string,
  folderId: string | null | undefined,
  message: ConnectedEmailListItem | null
) {
  if (!folderId || !message) return;
  const targetKey = emailKeys.messages(accountId, folderId);
  const movedMessage = { ...message, folderId, folder: folderId };
  queryClient.setQueryData<ConnectedEmailListItem[]>(targetKey, (current = []) => {
    if (current.some((item) => item.id === movedMessage.id)) return current;
    return [movedMessage, ...current];
  });
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
  putMessageInCachedFolder(queryClient, payload.accountId, payload.targetFolderId, movedMessage);
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
    queryClient.invalidateQueries({ queryKey: emailKeys.messagesRoot(accountId) }),
    queryClient.invalidateQueries({ queryKey: emailKeys.folders(accountId) }),
    queryClient.invalidateQueries({ queryKey: emailKeys.conversationRoot(accountId) }),
  ]);
}

export const useMoveEmailMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { accountId: string; messageId: string; folderId: string }) =>
      emailApi.moveMessage(payload.accountId, payload.messageId, payload.folderId),
    onMutate: (payload) => {
      toast.success('Email moved.');
      return applyOptimisticEmailMove(queryClient, {
        accountId: payload.accountId,
        messageId: payload.messageId,
        targetFolderId: payload.folderId,
      });
    },
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
    onMutate: (payload) => {
      toast.success('Email archived.');
      return applyOptimisticEmailMove(queryClient, {
        accountId: payload.accountId,
        messageId: payload.messageId,
        targetFolderId: payload.targetFolderId,
      });
    },
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
    onMutate: (payload) => {
      toast.success('Email unarchived.');
      return applyOptimisticEmailMove(queryClient, {
        accountId: payload.accountId,
        messageId: payload.messageId,
        targetFolderId: payload.targetFolderId,
      });
    },
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
    onMutate: (payload) => {
      toast.success('Email moved to deleted items.');
      return applyOptimisticEmailMove(queryClient, {
        accountId: payload.accountId,
        messageId: payload.messageId,
        targetFolderId: payload.targetFolderId,
      });
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
