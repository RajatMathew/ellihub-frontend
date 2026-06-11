import api from '@/app/api';
import {
  pdfNoticeConfigSchema,
  type PdfNoticeConfig,
  type PdfNoticeSection,
} from '@/modules/pdf/schemas';

export const pdfNoticesApi = {
  async getConfig(section: PdfNoticeSection): Promise<PdfNoticeConfig> {
    const res = await api.get(`/pdf/notices/${section}`);
    const raw = res.data?.data ?? res.data;
    const result = pdfNoticeConfigSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async updateSettings(
    section: PdfNoticeSection,
    data: { includeByDefault: boolean }
  ): Promise<PdfNoticeConfig> {
    const res = await api.put(`/pdf/notices/${section}/settings`, data);
    const raw = res.data?.data ?? res.data;
    const result = pdfNoticeConfigSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },
};
