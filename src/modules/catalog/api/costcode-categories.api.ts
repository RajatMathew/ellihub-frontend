import api from '@/app/api';
import {
  costCodeCategoryCreateSchema,
  costCodeCategoryListSchema,
  costCodeCategorySchema,
  costCodeCategoryUpdateSchema,
  type CostCodeCategory,
  type CostCodeCategoryCreate,
  type CostCodeCategoryUpdate,
} from '@/modules/catalog/schemas/costcode-category.schema';

const BASE = '/cost-code/categories';

export const costCodeCategoriesApi = {
  async list(): Promise<CostCodeCategory[]> {
    const res = await api.get(BASE);
    const rawData = res.data?.data ?? res.data ?? [];
    const result = costCodeCategoryListSchema.safeParse(rawData);
    
    if (!result.success) {
      console.warn('[costCodeCategoriesApi.list] Validation failed:', result.error.format());
      return rawData as CostCodeCategory[];
    }
    
    return result.data;
  },

  async get(id: string): Promise<CostCodeCategory> {
    const res = await api.get(`${BASE}/${id}`);
    return costCodeCategorySchema.parse(res.data?.data ?? res.data);
  },

  async create(data: CostCodeCategoryCreate): Promise<CostCodeCategory> {
    const body = costCodeCategoryCreateSchema.parse(data);
    const res = await api.post(BASE, body);
    return costCodeCategorySchema.parse(res.data?.data ?? res.data);
  },

  async update(data: CostCodeCategoryUpdate): Promise<CostCodeCategory> {
    const body = costCodeCategoryUpdateSchema.parse(data);
    const res = await api.put(BASE, body);
    return costCodeCategorySchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
