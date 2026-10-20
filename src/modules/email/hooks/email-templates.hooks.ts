import { toastApiError } from '@/app/lib/toast-api-error';
import {
  emailTemplatesApi,
  type EmailTemplate,
  type EmailTemplateInput,
} from '@/modules/email/api';
import { emailTemplateKeys } from '@/modules/email/constants/email-templates.keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const TEMPLATES_STALE_TIME_MS = 5 * 60 * 1000;

/**
 * The reader's email templates (elli-ui#668). Asked for only once the
 * templates popover opens — most messages are written without one — and kept
 * for five minutes, since only the reader changes them and every change here
 * writes straight into this cache.
 */
export const useEmailTemplatesQuery = (enabled: boolean) =>
  useQuery({
    queryKey: emailTemplateKeys.list(),
    queryFn: () => emailTemplatesApi.list(),
    enabled,
    staleTime: TEMPLATES_STALE_TIME_MS,
  });

const byName = (a: EmailTemplate, b: EmailTemplate) => a.name.localeCompare(b.name);

export const useSaveEmailTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmailTemplateInput & { id?: string }) =>
      input.id
        ? emailTemplatesApi.update(input.id, {
            name: input.name,
            subject: input.subject,
            body: input.body,
          })
        : emailTemplatesApi.create(input),
    onSuccess: (saved, input) => {
      queryClient.setQueryData<EmailTemplate[]>(emailTemplateKeys.list(), (current = []) =>
        [...current.filter((template) => template.id !== saved.id), saved].sort(byName)
      );
      toast.success(input.id ? 'Template saved.' : 'Template added.');
    },
    onError: (error) => toastApiError(error, 'Could not save the template. Try again.'),
  });
};

export const useDeleteEmailTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailTemplatesApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<EmailTemplate[]>(emailTemplateKeys.list(), (current = []) =>
        current.filter((template) => template.id !== id)
      );
      toast.success('Template deleted.');
    },
    onError: (error) => toastApiError(error, 'Could not delete the template. Try again.'),
  });
};
