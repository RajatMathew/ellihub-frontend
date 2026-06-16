import api from '@/app/api';
import {
  pdfTermsConfigSchema,
  type PdfTermsConfig,
  type PdfTermsSection,
} from '@/modules/pdf/schemas';

export const pdfTermsApi = {
  async getConfig(section: PdfTermsSection): Promise<PdfTermsConfig> {
    const res = await api.get(`/pdf/terms/${section}`);
    const raw = res.data?.data ?? res.data;
    const result = pdfTermsConfigSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },

  async updateSettings(
    section: PdfTermsSection,
    data: { includeByDefault: boolean }
  ): Promise<PdfTermsConfig> {
    const res = await api.put(`/pdf/terms/${section}/settings`, data);
    const raw = res.data?.data ?? res.data;
    const result = pdfTermsConfigSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },
};
