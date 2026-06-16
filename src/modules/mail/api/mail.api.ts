import api from '@/app/api';
import {
  featureMailActionSchema,
  featureMailDraftSchema,
  featureMailTargetSchema,
  type FeatureMailAction,
  type FeatureMailDraft,
  type FeatureMailTarget,
} from '@/modules/mail/schemas/mail.schema';

const BASE = '/mail/features';

export const mailApi = {
  async getFeatureDraft(target: FeatureMailTarget): Promise<FeatureMailDraft> {
    const params = featureMailTargetSchema.parse(target);
    const res = await api.get(`${BASE}/draft`, { params });
    return featureMailDraftSchema.parse(res.data?.data ?? res.data);
  },

  async previewFeatureMail(action: FeatureMailAction): Promise<FeatureMailDraft> {
    const payload = featureMailActionSchema.parse(action);
    const res = await api.post(`${BASE}/preview`, payload);
    return featureMailDraftSchema.parse(res.data?.data ?? res.data);
  },

  async sendFeatureMail(action: FeatureMailAction): Promise<FeatureMailDraft> {
    const payload = featureMailActionSchema.parse(action);
    const res = await api.post(`${BASE}/send`, payload);
    return featureMailDraftSchema.parse(res.data?.data ?? res.data);
  },
};
