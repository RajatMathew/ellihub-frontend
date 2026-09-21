import api from '@/app/api';
import {
  feedbackBoardSchema,
  feedbackDetailSchema,
  feedbackSubmitResultSchema,
  type FeedbackBoard,
  type FeedbackDetail,
  type FeedbackFormData,
  type FeedbackSubmitResult,
} from '@/modules/feedback/schemas/feedback.schema';

const BASE = '/feedback';

export interface FeedbackSubmitInput extends FeedbackFormData {
  currentUrl?: string;
  userAgent?: string;
}

export const feedbackApi = {
  async getBoard(): Promise<FeedbackBoard> {
    const response = await api.get(BASE);
    const raw = response.data?.data ?? response.data;
    const result = feedbackBoardSchema.safeParse(raw);

    if (!result.success) {
      console.error('[feedbackApi.getBoard] Zod parse error:', result.error.issues);
      throw result.error;
    }

    return result.data;
  },

  async getDetail(id: string): Promise<FeedbackDetail> {
    const response = await api.get(`${BASE}/${id}`);
    const raw = response.data?.data ?? response.data;
    const result = feedbackDetailSchema.safeParse(raw);

    if (!result.success) {
      console.error('[feedbackApi.getDetail] Zod parse error:', result.error.issues);
      throw result.error;
    }

    return result.data;
  },

  async submitFeedback(input: FeedbackSubmitInput): Promise<FeedbackSubmitResult> {
    const formData = new FormData();

    if (input.title?.trim()) {
      formData.append('title', input.title.trim());
    }

    if (input.submitterName?.trim()) {
      formData.append('submitterName', input.submitterName.trim());
    }

    formData.append('message', input.message.trim());

    if (input.currentUrl) {
      formData.append('currentUrl', input.currentUrl);
    }

    if (input.userAgent) {
      formData.append('userAgent', input.userAgent);
    }

    input.files.forEach((file) => {
      formData.append('files[]', file);
    });

    const response = await api.post(BASE, formData, { timeout: 0 });
    const raw = response.data?.data ?? response.data;
    const result = feedbackSubmitResultSchema.safeParse(raw);

    if (!result.success) {
      console.error('[feedbackApi.submitFeedback] Zod parse error:', result.error.issues);
      throw result.error;
    }

    return result.data;
  },
};
