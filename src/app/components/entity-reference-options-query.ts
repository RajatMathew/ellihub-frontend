import {
  getReferenceKind,
  getReferenceTypeLabel,
  referenceOptionQueryType,
  type EntityReferenceApi,
  type EntityReferenceKind,
  type EntityReferenceOption,
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
    queryFn: ({ signal }: { signal?: AbortSignal } = {}): Promise<EntityReferenceOption[]> =>
      api.listOptions({ scopeId, types: ['project'], signal }).then(dedupeReferenceOptions),
    staleTime: 60 * 1000,
  };
}

type SearchableReferenceType = Exclude<EntityReferenceKind, 'other'>;

/**
 * The "All" tab's options: every searchable type, for every linked project, in
 * one request.
 *
 * This used to be one request per type per project — 1 + 4 × projects, so 21
 * with five linked — and each tick re-sent the lot. The project list is not
 * scoped by project; the server knows that, so the types go together.
 */
export function fetchAllReferenceOptions(
  api: EntityReferenceApi,
  params: {
    scopeId: string;
    types: SearchableReferenceType[];
    projectIds: string[];
    search?: string;
    signal?: AbortSignal;
  }
) {
  return api
    .listOptions({
      scopeId: params.scopeId,
      types: params.types.map(referenceOptionQueryType),
      projectIds: params.projectIds,
      search: params.search || undefined,
      size: 20,
      signal: params.signal,
    })
    .then((options) =>
      dedupeReferenceOptions(
        options.map((option) => ({
          ...option,
          groupLabel: getReferenceTypeLabel(getReferenceKind(option)),
        }))
      )
    );
}

/**
 * One tab's options. RFQ/PO/CO/invoice are scoped to the linked projects — all
 * of them in one request; the Project tab is never scoped.
 */
export function fetchReferenceOptionsOfType(
  api: EntityReferenceApi,
  params: {
    scopeId: string;
    type: SearchableReferenceType;
    projectIds: string[];
    search?: string;
    signal?: AbortSignal;
  }
) {
  return api
    .listOptions({
      scopeId: params.scopeId,
      types: [referenceOptionQueryType(params.type)],
      projectIds: params.type === 'project' ? undefined : params.projectIds,
      search: params.search || undefined,
      signal: params.signal,
    })
    .then(dedupeReferenceOptions);
}
