import { toastApiError } from '@/app/lib/toast-api-error';
import {
  emailApi,
  type EmailProvider,
  type SendConnectedEmailPayload,
} from '@/modules/email/api';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const emailKeys = {
  all: ['connected-email'] as const,
  accounts: () => [...emailKeys.all, 'accounts'] as const,
  folders: (accountId?: string) => [...emailKeys.all, 'folders', accountId] as const,
  messages: (accountId?: string, folderKey?: EmailFolderKey) =>
    [...emailKeys.all, 'messages', accountId, folderKey] as const,
  conversation: (accountId?: string, threadId?: string | null) =>
    [...emailKeys.all, 'conversation', accountId, threadId] as const,
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

export const useEmailMessagesQuery = (accountId: string | undefined, folderKey: EmailFolderKey) =>
  useQuery({
    queryKey: emailKeys.messages(accountId, folderKey),
    queryFn: () => emailApi.listMessages({ accountId: accountId!, folderKey }),
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
      await queryClient.invalidateQueries({ queryKey: emailKeys.messages(payload.accountId) });
      toast.success('Email sent.');
    },
    onError: (error) => toastApiError(error, 'Failed to send email.'),
  });
};
