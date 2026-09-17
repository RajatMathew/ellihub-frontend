import type {
  EntityReferenceApi,
  EntityReferenceOption,
} from '@/app/components/entity-reference-marker-storage';

/**
 * The Project tab's options, as a query the picker and a prefetch can share.
 *
 * Its own module rather than a second export from the picker: that file only
 * exports components, and Fast Refresh stops working when it exports anything
 * else.
 *
 * The picker's own query lives inside `PopoverContent`, so it could not start
 * until the popover was already open — the first open of a session showed an
 * empty list for the length of a round trip. This is the same key and the same
 * request, so warming it from the trigger means the picker opens populated.
 */
/** One row per record. The server can repeat one across pages of a search. */
export function dedupeReferenceOptions<T extends EntityReferenceOption>(options: T[]): T[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = [option.type, option.entityType ?? 'manual', option.entityId ?? option.label].join(
      '|'
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function projectReferenceOptionsQuery(scopeId: string, api: EntityReferenceApi) {
  return {
    queryKey: ['entity-reference-options', scopeId, 'project', [], ''] as const,
    queryFn: (): Promise<EntityReferenceOption[]> =>
      api
        .listOptions({ scopeId, type: 'project', projectId: undefined, search: undefined })
        .then(dedupeReferenceOptions),
    staleTime: 60 * 1000,
  };
}
