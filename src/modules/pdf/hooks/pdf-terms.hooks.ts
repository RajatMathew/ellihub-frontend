import { toastApiError } from '@/app/lib/toast-api-error';
import { pdfTermsApi } from '@/modules/pdf/api';
import { pdfTermsKeys } from '@/modules/pdf/constants';
import type { PdfTermsSection } from '@/modules/pdf/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const usePdfTermsConfigQuery = (section: PdfTermsSection) =>
  useQuery({
    queryKey: pdfTermsKeys.config(section),
    queryFn: () => pdfTermsApi.getConfig(section),
    staleTime: 5 * 60 * 1000,
  });

export const useUpdatePdfTermsSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      section,
      includeByDefault,
    }: {
      section: PdfTermsSection;
      includeByDefault: boolean;
    }) => pdfTermsApi.updateSettings(section, { includeByDefault }),
    onSuccess: (data) => {
      queryClient.setQueryData(pdfTermsKeys.config(data.section), data);
      void queryClient.invalidateQueries({ queryKey: pdfTermsKeys.config(data.section) });
      toast.success('PDF terms setting updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update PDF terms settings.'),
  });
};
