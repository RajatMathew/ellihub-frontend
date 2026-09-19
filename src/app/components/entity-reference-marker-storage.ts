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
  type: Exclude<EntityReferenceType, 'other'>;
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
  { type: 'changeOrder', label: 'CO', placeholder: 'Search change orders' },
  { type: 'invoice', label: 'Invoice', placeholder: 'Search invoices' },
];

/**
 * Fetches the reference options for one category (and optionally scoped to a
 * project) so a caller can inject its own backend — email binds this to
 * `emailApi.listReferenceOptions`, a future Tasks integration would bind its
 * own equivalent endpoint over `TaskEntityLink`.
 */
export type EntityReferenceApi = {
  listOptions: (params: {
    scopeId: string;
    type: Exclude<EntityReferenceType, 'other'>;
    projectId?: string;
    search?: string;
    size?: number;
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

export function getReferenceTypeLabel(type: EntityReferenceType): string {
  return ENTITY_REFERENCE_CATEGORIES.find((item) => item.type === type)?.label ?? 'Ref';
}

/** "Job" reads better than "Project" as a tag-row label in the chip list. */
export function getReferenceGroupLabel(type: EntityReferenceType): string {
  if (type === 'project') return 'Job';
  return getReferenceTypeLabel(type);
}

export function groupReferencesByType(references: EntityReference[]) {
  const groups = new Map<EntityReferenceType, EntityReference[]>();
  for (const reference of references) {
    if (reference.type === 'other') continue;
    const bucket = groups.get(reference.type) ?? [];
    bucket.push(reference);
    groups.set(reference.type, bucket);
  }

  return Array.from(groups, ([type, groupReferences]) => ({
    type,
    references: groupReferences,
  }));
}
