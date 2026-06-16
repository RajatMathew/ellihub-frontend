import { toastApiError } from '@/app/lib/toast-api-error';
import { pdfNoticesApi } from '@/modules/pdf/api';
import { pdfNoticeKeys } from '@/modules/pdf/constants';
import type { PdfNoticeSection } from '@/modules/pdf/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const usePdfNoticeConfigQuery = (section: PdfNoticeSection) =>
  useQuery({
    queryKey: pdfNoticeKeys.config(section),
    queryFn: () => pdfNoticesApi.getConfig(section),
    staleTime: 5 * 60 * 1000,
  });

export const useUpdatePdfNoticeSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      section,
      includeByDefault,
    }: {
      section: PdfNoticeSection;
      includeByDefault: boolean;
    }) => pdfNoticesApi.updateSettings(section, { includeByDefault }),
    onSuccess: (data) => {
      queryClient.setQueryData(pdfNoticeKeys.config(data.section), data);
      void queryClient.invalidateQueries({ queryKey: pdfNoticeKeys.config(data.section) });
      toast.success('PDF warning setting updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update PDF warning settings.'),
  });
};
