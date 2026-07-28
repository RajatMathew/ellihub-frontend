import api from '@/app/api';
import { z } from 'zod';

const activityValueTypeSchema = z.enum([
  'text',
  'number',
  'currency',
  'date',
  'datetime',
  'boolean',
  'email',
  'phone',
  'percent',
  'list',
  'collection',
  'file',
  'status',
]);

const activityChangeValueSchema = z.object({
  raw: z.unknown().nullable(),
  display: z.string(),
});
const activityCollectionFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  valueType: activityValueTypeSchema.optional(),
  from: activityChangeValueSchema,
  to: activityChangeValueSchema,
});

const activityCollectionSchema = z.object({
  itemLabel: z.string(),
  addedCount: z.number(),
  removedCount: z.number(),
  modifiedCount: z.number(),
  rows: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      status: z.enum(['added', 'removed', 'modified']),
      fields: z.array(activityCollectionFieldSchema),
    })
  ),
});

const activityDetailsSubjectSchema = z.object({
  label: z.string().optional(),
  displayName: z.string(),
});

export const activityFieldDiffDetailsSchema = z.object({
  kind: z.literal('field-diff'),
  schemaVersion: z.literal(1),
  subject: activityDetailsSubjectSchema,
  revision: z.number(),
  changes: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      section: z.string(),
      valueType: activityValueTypeSchema.optional(),
      from: activityChangeValueSchema,
      to: activityChangeValueSchema,
      collection: activityCollectionSchema.optional(),
    })
  ),
});

export const activityFieldSnapshotDetailsSchema = z.object({
  kind: z.literal('field-snapshot'),
  schemaVersion: z.literal(1),
  subject: activityDetailsSubjectSchema,
  fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      section: z.string(),
      valueType: activityValueTypeSchema.optional(),
      value: activityChangeValueSchema,
    })
  ),
});

export const activityDetailsSchema = z.union([
  activityFieldDiffDetailsSchema,
  activityFieldSnapshotDetailsSchema,
]);

export type ActivityFieldDiffDetails = z.infer<typeof activityFieldDiffDetailsSchema>;
export type ActivityFieldSnapshotDetails = z.infer<typeof activityFieldSnapshotDetailsSchema>;
export type ActivityLogDetails = z.infer<typeof activityDetailsSchema>;

const activityLogDetailsSchema = z
  .unknown()
  .optional()
  .nullable()
  .transform((value): ActivityLogDetails | null => {
    const parsed = activityDetailsSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  });
const activityUserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

export const activityLogItemSchema = z.object({
  id: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  description: z.string(),
  note: z.string().optional().nullable(),
  revision: z.number().optional().nullable(),
  details: activityLogDetailsSchema,
  affectedEntityIds: z.array(z.string()).optional(),
  createdAt: z.string(),
  editedAt: z.string().optional().nullable(),
  deletedAt: z.string().optional().nullable(),
  deletedBy: z.string().optional().nullable(),
  user: activityUserSchema,
});

export const activityLogPaginatedResponseSchema = z.object({
  data: z.array(activityLogItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type ActivityLogItem = z.infer<typeof activityLogItemSchema>;
export type ActivityLogPaginatedResponse = z.infer<typeof activityLogPaginatedResponseSchema>;

export interface ListActivityLogParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface CreateActivityCommentInput {
  entityType: string;
  entityId: string;
  note: string;
}

export interface UpdateActivityCommentInput {
  commentId: string;
  note: string;
}

const BASE = '/activity-log';

function parseActivityLogItem(payload: unknown): ActivityLogItem {
  return activityLogItemSchema.parse(payload);
}

export const activityLogApi = {
  async list(params?: ListActivityLogParams): Promise<ActivityLogPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;

    const endpoint =
      params?.entityType && params?.entityId
        ? BASE + '/entity/' + params.entityType + '/' + params.entityId
        : BASE;

    if (!params?.entityType || !params?.entityId) {
      if (params?.sortBy) query.sortBy = params.sortBy;
      if (params?.sortOrder) query.sortOrder = params.sortOrder;
      if (params?.entityType) query.entityType = params.entityType;
      if (params?.entityId) query.entityId = params.entityId;
      if (params?.action) query.action = params.action;
      if (params?.userId) query.userId = params.userId;
      if (params?.from) query.from = params.from;
      if (params?.to) query.to = params.to;
      if (params?.search) query.search = params.search;
    }

    const res = await api.get(endpoint, { params: query });
    const rows = res.data?.data ?? res.data ?? [];
    const pagination = res.data?.pagination ?? {};

    return activityLogPaginatedResponseSchema.parse({
      data: rows,
      pagination: {
        currentPage: pagination.currentPage ?? params?.page ?? 1,
        totalPages: pagination.totalPages ?? 1,
        hasNextPage: pagination.hasNextPage ?? false,
        hasPreviousPage: pagination.hasPreviousPage ?? false,
        totalItems: pagination.totalItems ?? rows.length,
        itemsPerPage: pagination.itemsPerPage ?? params?.size ?? 25,
      },
    });
  },

  async listForEmployee(
    employeeId: string,
    params?: Pick<ListActivityLogParams, 'page' | 'size'>
  ): Promise<ActivityLogPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;

    const res = await api.get(BASE + '/employee/' + employeeId, { params: query });
    const rows = res.data?.data ?? res.data ?? [];
    const pagination = res.data?.pagination ?? {};

    return activityLogPaginatedResponseSchema.parse({
      data: rows,
      pagination: {
        currentPage: pagination.currentPage ?? params?.page ?? 1,
        totalPages: pagination.totalPages ?? 1,
        hasNextPage: pagination.hasNextPage ?? false,
        hasPreviousPage: pagination.hasPreviousPage ?? false,
        totalItems: pagination.totalItems ?? rows.length,
        itemsPerPage: pagination.itemsPerPage ?? params?.size ?? 100,
      },
    });
  },

  async createComment(input: CreateActivityCommentInput): Promise<ActivityLogItem> {
    const res = await api.post(
      BASE + '/entity/' + input.entityType + '/' + input.entityId + '/comments',
      {
        note: input.note,
      }
    );
    return parseActivityLogItem(res.data?.data ?? res.data);
  },

  async updateComment(input: UpdateActivityCommentInput): Promise<ActivityLogItem> {
    const res = await api.patch(BASE + '/comments/' + input.commentId, { note: input.note });
    return parseActivityLogItem(res.data?.data ?? res.data);
  },

  async deleteComment(commentId: string): Promise<ActivityLogItem> {
    const res = await api.delete(BASE + '/comments/' + commentId);
    return parseActivityLogItem(res.data?.data ?? res.data);
  },
};
