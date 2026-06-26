import { toastApiError } from '@/app/lib/toast-api-error';
import { feedbackApi, type FeedbackSubmitInput } from '@/modules/feedback/api/feedback.api';
import { feedbackKeys } from '@/modules/feedback/constants/feedback.keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useFeedbackBoardQuery(enabled: boolean) {
  return useQuery({
    queryKey: feedbackKeys.board(),
    queryFn: () => feedbackApi.getBoard(),
    enabled,
  });
}

export function useSubmitFeedbackMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: feedbackKeys.submit(),
    mutationFn: (input: FeedbackSubmitInput) => feedbackApi.submitFeedback(input),
    onSuccess: () => {
      toast.success('Feedback sent to the feedback board.');
      void queryClient.invalidateQueries({ queryKey: feedbackKeys.board() });
    },
    onError: (error) => {
      toastApiError(error, 'Failed to send feedback.');
    },
  });
}
