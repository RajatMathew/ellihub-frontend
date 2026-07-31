import { toastApiError } from '@/app/lib/toast-api-error';
import { quickShortcutsApi } from '@/modules/quick-shortcuts/api/quick-shortcuts.api';
import { quickShortcutsKeys } from '@/modules/quick-shortcuts/constants/quick-shortcuts.keys';
import type {
  QuickShortcut,
  QuickShortcutWriteInput,
} from '@/modules/quick-shortcuts/schemas/quick-shortcut.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useQuickShortcutsQuery() {
  return useQuery({
    queryKey: quickShortcutsKeys.list(),
    queryFn: quickShortcutsApi.list,
    staleTime: 60_000,
  });
}

export function useCreateQuickShortcutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: QuickShortcutWriteInput) => quickShortcutsApi.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: quickShortcutsKeys.all });
      toast.success('Shortcut added');
    },
    onError: (error) => toastApiError(error, 'Failed to add shortcut.'),
  });
}

export function useUpdateQuickShortcutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: QuickShortcutWriteInput }) =>
      quickShortcutsApi.update(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: quickShortcutsKeys.all });
      toast.success('Shortcut updated');
    },
    onError: (error) => toastApiError(error, 'Failed to update shortcut.'),
  });
}

export function useDeleteQuickShortcutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quickShortcutsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: quickShortcutsKeys.all });
      toast.success('Shortcut deleted');
    },
    onError: (error) => toastApiError(error, 'Failed to delete shortcut.'),
  });
}

export function useReorderQuickShortcutsMutation() {
  const queryClient = useQueryClient();
  const queryKey = quickShortcutsKeys.list();

  return useMutation({
    mutationFn: (ids: string[]) => quickShortcutsApi.reorder(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<QuickShortcut[]>(queryKey);
      if (previous) {
        const byId = new Map(previous.map((shortcut) => [shortcut.id, shortcut]));
        queryClient.setQueryData<QuickShortcut[]>(
          queryKey,
          ids.flatMap((id, position) => {
            const shortcut = byId.get(id);
            return shortcut ? [{ ...shortcut, position }] : [];
          })
        );
      }
      return { previous };
    },
    onError: (error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toastApiError(error, 'Failed to reorder shortcuts.');
    },
    onSuccess: (shortcuts) => {
      queryClient.setQueryData(queryKey, shortcuts);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
}
