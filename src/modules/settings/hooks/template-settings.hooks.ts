import { toastApiError } from '@/app/lib/toast-api-error';
import { pdfNoticeKeys, pdfTermsKeys } from '@/modules/pdf/constants';
import {
  templateSettingsApi,
  type TemplateSettingListParams,
} from '@/modules/settings/api/template-settings.api';
import type {
  TemplateSettingInput,
  TemplateSettingUpdateInput,
} from '@/modules/settings/schemas/template-settings.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const templateSettingsKeys = {
  all: ['template-settings'] as const,
  list: (params?: TemplateSettingListParams) =>
    [...templateSettingsKeys.all, 'list', params ?? {}] as const,
};

export function useTemplateSettingsQuery(params?: TemplateSettingListParams) {
  return useQuery({
    queryKey: templateSettingsKeys.list(params),
    queryFn: () => templateSettingsApi.list(params),
  });
}

export function useCreateTemplateSettingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TemplateSettingInput) => templateSettingsApi.create(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templateSettingsKeys.all });
      await qc.invalidateQueries({ queryKey: pdfTermsKeys.all });
      await qc.invalidateQueries({ queryKey: pdfNoticeKeys.all });
      toast.success('Template created.');
    },
    onError: (error) => toastApiError(error, 'Failed to create template.'),
  });
}

export function useUpdateTemplateSettingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TemplateSettingUpdateInput) => templateSettingsApi.update(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templateSettingsKeys.all });
      await qc.invalidateQueries({ queryKey: pdfTermsKeys.all });
      await qc.invalidateQueries({ queryKey: pdfNoticeKeys.all });
      toast.success('Template updated.');
    },
    onError: (error) => toastApiError(error, 'Failed to update template.'),
  });
}

export function useSetDefaultTemplateSettingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templateSettingsApi.setDefault(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templateSettingsKeys.all });
      await qc.invalidateQueries({ queryKey: pdfTermsKeys.all });
      await qc.invalidateQueries({ queryKey: pdfNoticeKeys.all });
      toast.success('Default template updated.');
    },
    onError: (error) => toastApiError(error, 'Failed to set default template.'),
  });
}

export function useDeleteTemplateSettingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templateSettingsApi.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: templateSettingsKeys.all });
      await qc.invalidateQueries({ queryKey: pdfTermsKeys.all });
      await qc.invalidateQueries({ queryKey: pdfNoticeKeys.all });
      toast.success('Template deleted.');
    },
    onError: (error) => toastApiError(error, 'Failed to delete template.'),
  });
}
