import { z } from 'zod';

import { api } from './client';

/**
 * Largest batch the API accepts in one request. Mirrors `BULK_DELETE_MAX_IDS`
 * in elli-core; the server rejects anything larger with a 400.
 */
export const BULK_DELETE_MAX_IDS = 100;

const bulkDeleteFailureSchema = z.object({
  id: z.string(),
  /** Written for the user — a blocked delete says what would unblock it. */
  message: z.string(),
  /** Error class name, or `InternalError` when the server would not classify it. */
  code: z.string(),
});

const bulkDeleteResultSchema = z.object({
  requested: z.number(),
  deletedIds: z.array(z.string()),
  failed: z.array(bulkDeleteFailureSchema),
});

export type BulkDeleteFailure = z.infer<typeof bulkDeleteFailureSchema>;
export type BulkDeleteResult = z.infer<typeof bulkDeleteResultSchema>;

/**
 * Calls a resource's `POST {path}/bulk-delete`.
 *
 * Every bulk delete in the app goes through this one function, so a module's API
 * file declares only its path:
 *
 * ```ts
 * bulkRemove: (ids: string[]) => bulkDeleteRequest(`${BASE}/bulk-delete`, ids),
 * ```
 *
 * The request resolves with a 200 even when individual ids failed — a partial
 * delete is a normal outcome, not an error. Read `failed` to report it.
 */
export async function bulkDeleteRequest(path: string, ids: string[]): Promise<BulkDeleteResult> {
  const res = await api.post(path, { ids });
  return bulkDeleteResultSchema.parse(res.data?.data ?? res.data);
}
