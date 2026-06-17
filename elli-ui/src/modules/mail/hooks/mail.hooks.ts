import { toastApiError } from '@/app/lib/toast-api-error';
import { mailApi } from '@/modules/mail/api';
import type { FeatureMailAction, FeatureMailTarget } from '@/modules/mail/schemas/mail.schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export const mailKeys = {
  all: ['mail'] as const,
  featureDraft: (target: FeatureMailTarget | null) =>
    [...mailKeys.all, 'feature-draft', target?.feature, target?.entityId] as const,
};

export const useFeatureMailDraftQuery = (target: FeatureMailTarget | null, enabled = false) =>
  useQuery({
    queryKey: mailKeys.featureDraft(target),
    queryFn: () => mailApi.getFeatureDraft(target!),
    enabled: !!target && enabled,
  });

export const usePreviewFeatureMailMutation = () =>
  useMutation({
    mutationFn: (action: FeatureMailAction) => mailApi.previewFeatureMail(action),
    onError: (err) => toastApiError(err, 'Failed to preview email.'),
  });

export const useSendFeatureMailMutation = () =>
  useMutation({
    mutationFn: (action: FeatureMailAction) => mailApi.sendFeatureMail(action),
    onSuccess: () => toast.success('Email sent.'),
    onError: (err) => toastApiError(err, 'Failed to send email.'),
  });
