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
