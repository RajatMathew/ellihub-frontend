import { toastApiError } from '@/app/lib/toast-api-error';
import { feedbackApi, type FeedbackSubmitInput } from '@/modules/feedback/api/feedback.api';
import { feedbackKeys } from '@/modules/feedback/constants/feedback.keys';
import type {
  FeedbackBoard,
  FeedbackBoardColumn,
  FeedbackBoardItem,
} from '@/modules/feedback/schemas/feedback.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function deriveFeedbackTitle(input: FeedbackSubmitInput): string {
  const fallback = input.message.split('\n')[0]?.trim() || 'Feedback';
  const title = input.title?.trim() || fallback;

  return title.length > 120 ? `${title.slice(0, 117)}...` : title;
}

function buildOptimisticItem(input: FeedbackSubmitInput): FeedbackBoardItem {
  const tempId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `temp-${crypto.randomUUID()}`
      : `temp-${Date.now()}`;

  return {
    id: tempId,
    title: deriveFeedbackTitle(input),
    status: 'Feedback',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function insertOptimisticItem(
  board: FeedbackBoard | undefined,
  item: FeedbackBoardItem
): FeedbackBoard {
  if (!board) {
    return {
      columns: [
        {
          id: 'feedback',
          title: 'Feedback',
          status: 'Feedback',
          items: [item],
        },
      ],
    };
  }

  const columns = board.columns.map((column) => ({
    ...column,
    items: [...column.items],
  }));
  const targetColumn =
    columns.find((column) => column.status.toLowerCase() === 'feedback') ?? columns[0];

  if (!targetColumn) {
    return {
      columns: [
        {
          id: 'feedback',
          title: 'Feedback',
          status: 'Feedback',
          items: [item],
        },
      ],
    };
  }

  targetColumn.items.unshift(item);
  return { columns };
}

function replaceOptimisticItem(
  board: FeedbackBoard | undefined,
  tempId: string,
  nextValues: Partial<FeedbackBoardItem>
): FeedbackBoard | undefined {
  if (!board) return board;

  let changed = false;
  const columns: FeedbackBoardColumn[] = board.columns.map((column) => {
    const items = column.items.map((item) => {
      if (item.id !== tempId) return item;
      changed = true;
      return { ...item, ...nextValues };
    });

    return { ...column, items };
  });

  return changed ? { columns } : board;
}

function removeOptimisticItem(
  board: FeedbackBoard | undefined,
  tempId: string
): FeedbackBoard | undefined {
  if (!board) return board;

  let changed = false;
  const columns: FeedbackBoardColumn[] = board.columns.map((column) => {
    const items = column.items.filter((item) => {
      const shouldKeep = item.id !== tempId;
      if (!shouldKeep) changed = true;
      return shouldKeep;
    });

    return items === column.items ? column : { ...column, items };
  });

  return changed ? { columns } : board;
}

export function useFeedbackBoardQuery(enabled: boolean) {
  return useQuery({
    queryKey: feedbackKeys.board(),
    queryFn: () => feedbackApi.getBoard(),
    enabled,
  });
}

export function useFeedbackDetailQuery(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: feedbackKeys.detail(id ?? 'unknown'),
    queryFn: () => feedbackApi.getDetail(id ?? ''),
    enabled: enabled && Boolean(id),
  });
}

export function useSubmitFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: feedbackKeys.submit(),
    mutationFn: (input: FeedbackSubmitInput) => feedbackApi.submitFeedback(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: feedbackKeys.board() });

      const hadBoardCache =
        queryClient.getQueryData<FeedbackBoard>(feedbackKeys.board()) !== undefined;
      const optimisticItem = buildOptimisticItem(input);

      queryClient.setQueryData<FeedbackBoard>(feedbackKeys.board(), (currentBoard) =>
        insertOptimisticItem(currentBoard, optimisticItem)
      );

      return { hadBoardCache, optimisticItemId: optimisticItem.id };
    },
    onSuccess: (result, _input, context) => {
      if (context?.optimisticItemId) {
        queryClient.setQueryData<FeedbackBoard>(feedbackKeys.board(), (currentBoard) =>
          replaceOptimisticItem(currentBoard, context.optimisticItemId, {
            id: result.id,
            url: result.notionUrl,
          })
        );
      }

      toast.success('Feedback sent to the feedback board.');
      void queryClient.invalidateQueries({ queryKey: feedbackKeys.board() });
    },
    onError: (error, _input, context) => {
      if (context?.optimisticItemId && context.hadBoardCache) {
        queryClient.setQueryData<FeedbackBoard>(feedbackKeys.board(), (currentBoard) =>
          removeOptimisticItem(currentBoard, context.optimisticItemId)
        );
      } else if (context?.optimisticItemId) {
        queryClient.removeQueries({ queryKey: feedbackKeys.board(), exact: true });
      }

      toastApiError(error, 'Failed to send feedback.');
    },
  });
}
