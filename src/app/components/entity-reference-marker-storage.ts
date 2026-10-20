/**
 * Domain-neutral types for the entity reference marker (tagging something —
 * an email thread, a task — with a project/RFQ/RFI/PO/CO/invoice, or marking
 * it "Other"). The email module's own storage file re-exports these under
 * its historical names so existing imports keep working; a future Tasks
 * integration should import straight from here instead of duplicating them.
 */

export type EntityReferenceType =
  | 'project'
  | 'rfq'
  | 'rfi'
  | 'purchaseOrder'
  | 'changeOrder'
  | 'invoice'
  | 'other';

export type EntityReferenceEntityType =
  | 'project'
  | 'rfq'
  | 'purchaseOrder'
  | 'primeChangeOrder'
  | 'subChangeOrder'
  | 'invoice';

/**
 * What the picker and the linked-item rows group a reference under.
 *
 * The same as its `type`, except that a change order splits in two: a prime
 * change order (the owner's) and a sub change order (a vendor's) are both
 * stored as `changeOrder`, told apart by `entityType`, but they are different
 * records and read as different tags — "Prime CO" and "SCO" (elli-ui#1163).
 * A `changeOrder` with no entity (typed in by hand) is an SCO, as it always was.
 */
export type EntityReferenceKind = EntityReferenceType | 'primeChangeOrder';

/** What the options endpoint can be asked for: the stored types, plus each half of a change order. */
export type EntityReferenceOptionQueryType =
  | Exclude<EntityReferenceType, 'other'>
  | 'primeChangeOrder'
  | 'subChangeOrder';

export function getReferenceKind<T extends string = EntityReferenceType>(reference: {
  type: T;
  entityType?: string | null;
}): T | 'primeChangeOrder' {
  return reference.type === 'changeOrder' && reference.entityType === 'primeChangeOrder'
    ? 'primeChangeOrder'
    : reference.type;
}

/**
 * The search a category's tab sends. The SCO tab asks for sub change orders
 * only: `changeOrder` would bring the prime ones back into it, sharing its row
 * limit, which is how they ended up listed — and tagged — as SCOs.
 */
export function referenceOptionQueryType(
  kind: Exclude<EntityReferenceKind, 'other'>
): EntityReferenceOptionQueryType {
  return kind === 'changeOrder' ? 'subChangeOrder' : kind;
}

/** The stored type a hand-typed reference of this kind gets, or null where it cannot be typed in. */
export function manualReferenceType(kind: EntityReferenceKind): EntityReferenceType | null {
  // A typed-in label carries no entity, so a "prime" one would be saved — and
  // read back — as an SCO.
  return kind === 'primeChangeOrder' ? null : kind;
}

export type EntityReference = {
  id?: string;
  type: EntityReferenceType;
  entityType?: EntityReferenceEntityType | null;
  entityId?: string | null;
  label: string;
  sortOrder?: number;
};

export type EntityReferenceOption = {
  type: EntityReferenceType;
  entityType: EntityReferenceEntityType | null;
  entityId: string | null;
  label: string;
  meta: string | null;
};

export type EntityReferenceCategory = {
  type: Exclude<EntityReferenceKind, 'other'>;
  label: string;
  placeholder: string;
  /** RFI-style: a free-text form, no search/lookup against the backend. */
  manualEntry?: boolean;
};

/** Shared by email and (eventually) tasks — both tag the same kinds of records. */
export const ENTITY_REFERENCE_CATEGORIES: EntityReferenceCategory[] = [
  { type: 'project', label: 'Project', placeholder: 'Search projects' },
  { type: 'rfq', label: 'RFQ', placeholder: 'Search RFQs' },
  { type: 'rfi', label: 'RFI', placeholder: 'RFI-112', manualEntry: true },
  { type: 'purchaseOrder', label: 'PO', placeholder: 'Search purchase orders' },
  { type: 'primeChangeOrder', label: 'Prime CO', placeholder: 'Search prime change orders' },
  { type: 'changeOrder', label: 'SCO', placeholder: 'Search sub change orders' },
  { type: 'invoice', label: 'Invoice', placeholder: 'Search invoices' },
];

/**
 * Fetches the reference options for one or more categories (optionally scoped
 * to the linked projects) so a caller can inject its own backend — email binds
 * this to `emailApi.listReferenceOptions`, a future Tasks integration would
 * bind its own equivalent endpoint over `TaskEntityLink`.
 *
 * Several types and several projects go in one call. The "All" tab used to
 * make one call per type per project — 21 with five projects linked — and
 * every one of them paid the server's auth and account checks.
 */
export type EntityReferenceApi = {
  listOptions: (params: {
    scopeId: string;
    types: EntityReferenceOptionQueryType[];
    projectIds?: string[];
    search?: string;
    size?: number;
    /** Aborts a request the picker no longer wants — a tick or a keystroke replaced it. */
    signal?: AbortSignal;
  }) => Promise<EntityReferenceOption[]>;
};

type ReferenceLike = Pick<EntityReference, 'type' | 'entityType' | 'entityId' | 'label'>;

/** Whether two references (or a reference and a picker option) are the same record. */
export function referencesMatch(a: ReferenceLike, b: ReferenceLike) {
  if (a.type !== b.type) return false;
  if (a.entityId || b.entityId) {
    return a.entityId === b.entityId && (a.entityType ?? null) === (b.entityType ?? null);
  }

  return a.label.toLowerCase() === b.label.toLowerCase();
}

/**
 * Picked options first, in the order they were picked; everything else after,
 * in the order it arrived.
 *
 * `selected` is click order — `addReference` appends and
 * `normalizeReferenceTimeline` numbers by array index — and that is what the
 * pinned block is sorted by (elli-ui#1041). Sorting it by the fetched
 * (alphabetical) order instead meant the row you had just ticked landed
 * wherever its name happened to fall among the others, so the row that
 * visibly jumped to the top was rarely the one you touched.
 *
 * The sort is stable, so the unpicked tail keeps the server's ordering.
 */
export function orderOptionsBySelection<T extends ReferenceLike>(
  options: T[],
  selected: ReferenceLike[]
): T[] {
  const indexOf = (option: T) =>
    selected.findIndex((reference) => referencesMatch(reference, option));

  return [...options].sort((a, b) => {
    const aIndex = indexOf(a);
    const bIndex = indexOf(b);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export function getReferenceIdentity(
  reference: Pick<EntityReference, 'type' | 'entityType' | 'entityId' | 'label'>
) {
  const valueKey = reference.entityId
    ? `id:${reference.entityId}`
    : `label:${reference.label.toLowerCase()}`;
  return [reference.type, reference.entityType ?? 'manual', valueKey].join('|');
}

export function normalizeReferenceTimeline(references: EntityReference[]) {
  const seenReferences = new Set<string>();
  const uniqueReferences: EntityReference[] = [];

  for (const reference of references) {
    if (reference.type === 'other') return [{ ...reference, sortOrder: 0 }];
    const key = getReferenceIdentity(reference);
    if (seenReferences.has(key)) continue;
    seenReferences.add(key);
    uniqueReferences.push(reference);
  }

  return uniqueReferences.map((reference, index) => ({ ...reference, sortOrder: index }));
}

export function getReferenceTypeLabel(type: EntityReferenceKind): string {
  return ENTITY_REFERENCE_CATEGORIES.find((item) => item.type === type)?.label ?? 'Ref';
}

/** "Job" reads better than "Project" as a tag-row label in the chip list. */
export function getReferenceGroupLabel(type: EntityReferenceKind): string {
  if (type === 'project') return 'Job';
  return getReferenceTypeLabel(type);
}

export function groupReferencesByType(references: EntityReference[]) {
  const groups = new Map<EntityReferenceKind, EntityReference[]>();
  for (const reference of references) {
    if (reference.type === 'other') continue;
    const kind = getReferenceKind(reference);
    const bucket = groups.get(kind) ?? [];
    bucket.push(reference);
    groups.set(kind, bucket);
  }

  return Array.from(groups, ([type, groupReferences]) => ({
    type,
    references: groupReferences,
  }));
}
