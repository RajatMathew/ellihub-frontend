import api from '@/app/api';
import {
  templateSettingSchema,
  type TemplateSetting,
  type TemplateSettingInput,
  type TemplateSettingKind,
  type TemplateSettingStatus,
  type TemplateSettingUpdateInput,
} from '@/modules/settings/schemas/template-settings.schema';

const BASE = '/template-settings';

function parseTemplateSetting(raw: unknown): TemplateSetting {
  return templateSettingSchema.parse(raw) as TemplateSetting;
}

export type TemplateSettingListParams = {
  kind?: TemplateSettingKind;
  key?: string;
  status?: TemplateSettingStatus;
};

export const templateSettingsApi = {
  async list(params?: TemplateSettingListParams): Promise<TemplateSetting[]> {
    const res = await api.get(BASE, { params });
    const raw = res.data?.data ?? res.data;
    return templateSettingSchema.array().parse(raw).map((item) => item as TemplateSetting);
  },

  async create(data: TemplateSettingInput): Promise<TemplateSetting> {
    const res = await api.post(BASE, data);
    return parseTemplateSetting(res.data?.data ?? res.data);
  },

  async update(data: TemplateSettingUpdateInput): Promise<TemplateSetting> {
    const res = await api.put(BASE, data);
    return parseTemplateSetting(res.data?.data ?? res.data);
  },

  async setDefault(id: string): Promise<TemplateSetting> {
    const res = await api.patch(`${BASE}/${id}/default`);
    return parseTemplateSetting(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
