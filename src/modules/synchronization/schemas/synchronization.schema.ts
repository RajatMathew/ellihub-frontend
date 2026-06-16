import { z } from 'zod';

const fieldwireSyncStatusSchema = z.enum(['SUCCESS', 'FAILED', 'PARTIAL']);
const nullableProjectSyncStatusSchema = z.enum(['SUCCESS', 'FAILED']).nullable();

const syncCountsSchema = z.object({
  totalReceived: z.number(),
  createdCount: z.number(),
  updatedCount: z.number(),
  deletedCount: z.number(),
});

export const fieldwireProjectSyncOverviewSchema = syncCountsSchema.extend({
  projectId: z.string(),
  projectName: z.string(),
  fieldwireProjectId: z.string(),
  fieldwireProjectName: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  lastSyncStatus: nullableProjectSyncStatusSchema,
  lastSyncError: z.string().nullable(),
});

export const fieldwireSyncOverviewSchema = z.object({
  provider: z.literal('fieldwire'),
  mappedProjectCount: z.number(),
  lastSyncedAt: z.string().nullable(),
  lastSyncStatus: fieldwireSyncStatusSchema.nullable(),
  lastSyncError: z.string().nullable(),
  totals: syncCountsSchema,
  projects: z.array(fieldwireProjectSyncOverviewSchema),
});

export const fieldwireProjectSyncResultSchema = syncCountsSchema.extend({
  projectId: z.string(),
  projectName: z.string(),
  fieldwireProjectId: z.string(),
  fieldwireProjectName: z.string().nullable(),
  status: z.enum(['SUCCESS', 'FAILED']),
  syncedAt: z.string().nullable(),
  error: z.string().nullable(),
});

export const fieldwireSyncResultSchema = z.object({
  provider: z.literal('fieldwire'),
  trigger: z.enum(['MANUAL', 'SCHEDULED']),
  startedAt: z.string(),
  finishedAt: z.string(),
  attempted: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  status: fieldwireSyncStatusSchema,
  totals: syncCountsSchema,
  projects: z.array(fieldwireProjectSyncResultSchema),
});

export type FieldwireSyncOverview = z.infer<typeof fieldwireSyncOverviewSchema>;
export type FieldwireSyncResult = z.infer<typeof fieldwireSyncResultSchema>;
