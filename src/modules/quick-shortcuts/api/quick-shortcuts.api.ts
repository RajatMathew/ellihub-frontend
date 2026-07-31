import api from '@/app/api';
import {
  quickShortcutSchema,
  type QuickShortcut,
  type QuickShortcutWriteInput,
} from '@/modules/quick-shortcuts/schemas/quick-shortcut.schema';

const BASE = '/quick-shortcuts';

function parseShortcut(raw: unknown): QuickShortcut {
  return quickShortcutSchema.parse(raw);
}

export const quickShortcutsApi = {
  async list(): Promise<QuickShortcut[]> {
    const response = await api.get(BASE);
    return quickShortcutSchema.array().parse(response.data?.data ?? response.data);
  },

  async create(input: QuickShortcutWriteInput): Promise<QuickShortcut> {
    const response = await api.post(BASE, input);
    return parseShortcut(response.data?.data ?? response.data);
  },

  async update(id: string, input: QuickShortcutWriteInput): Promise<QuickShortcut> {
    const response = await api.patch(`${BASE}/${id}`, input);
    return parseShortcut(response.data?.data ?? response.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async reorder(ids: string[]): Promise<QuickShortcut[]> {
    const response = await api.put(`${BASE}/order`, { ids });
    return quickShortcutSchema.array().parse(response.data?.data ?? response.data);
  },
};
