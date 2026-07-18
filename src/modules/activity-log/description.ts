const MAX_ACTIVITY_DESCRIPTION_LENGTH = 500;
const DEFAULT_ACTIVITY_CHANGE_SECTION = 'Changes';

export type ActivityValueFormatter = (value: unknown) => string;

export type ActivityValueType =
    | 'text'
    | 'number'
    | 'currency'
    | 'date'
    | 'datetime'
    | 'boolean'
    | 'email'
    | 'phone'
    | 'percent'
    | 'list'
    | 'collection'
    | 'file'
    | 'status';

export type ActivityChangeOptions = {
    key?: string;
    section?: string;
    valueType?: ActivityValueType;
};

export type ActivityCollectionRowStatus = 'added' | 'removed' | 'modified';

export type ActivityCollectionChangeField = {
    key: string;
    label: string;
    valueType?: ActivityValueType;
    from: string;
    to: string;
    rawFrom: unknown;
    rawTo: unknown;
};

export type ActivityCollectionChangeRow = {
    key: string;
    label: string;
    status: ActivityCollectionRowStatus;
    fields: ActivityCollectionChangeField[];
};

export type ActivityCollectionDiff = {
    itemLabel: string;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    rows: ActivityCollectionChangeRow[];
};
export type ActivityChange = {
    key: string;
    label: string;
    section?: string;
    valueType?: ActivityValueType;
    from: string;
    to: string;
    rawFrom: unknown;
    rawTo: unknown;
    collection?: ActivityCollectionDiff;
};

type JsonFriendlyValue =
    | string
    | number
    | boolean
    | null
    | JsonFriendlyValue[]
    | { [key: string]: JsonFriendlyValue };

export type ActivitySubject =
    | string
    | {
          label?: string;
          name: string;
      };

export type ActivityFieldDiffCollectionField = {
    key: string;
    label: string;
    valueType?: ActivityValueType;
    from: {
        raw: JsonFriendlyValue;
        display: string;
    };
    to: {
        raw: JsonFriendlyValue;
        display: string;
    };
};

export type ActivityFieldDiffCollectionRow = {
    key: string;
    label: string;
    status: ActivityCollectionRowStatus;
    fields: ActivityFieldDiffCollectionField[];
};

export type ActivityFieldDiffCollection = {
    itemLabel: string;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    rows: ActivityFieldDiffCollectionRow[];
};
export type ActivityFieldDiffChange = {
    key: string;
    label: string;
    section: string;
    valueType?: ActivityValueType;
    from: {
        raw: JsonFriendlyValue;
        display: string;
    };
    to: {
        raw: JsonFriendlyValue;
        display: string;
    };
    collection?: ActivityFieldDiffCollection;
};

export type ActivityFieldDiffDetails = {
    kind: 'field-diff';
    schemaVersion: 1;
    subject: {
        label?: string;
        displayName: string;
    };
    revision: number;
    changes: ActivityFieldDiffChange[];
};

function isDateLike(value: unknown): value is Date {
    return value instanceof Date && !Number.isNaN(value.getTime());
}

function toComparable(value: unknown): string {
    if (value === undefined || value === null || value === '') return '';
    if (isDateLike(value)) return value.toISOString().slice(0, 10);
    if (Array.isArray(value)) return JSON.stringify(value.map(toComparable));
    if (typeof value === 'object') {
        if ('toString' in value && value.toString !== Object.prototype.toString) {
            return value.toString();
        }

        return JSON.stringify(value);
    }
    return String(value);
}

function toActivityKey(label: string): string {
    const key = label
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();

    return key || 'value';
}

function truncateActivityDescription(description: string, maxLength: number): string {
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength - 3).trimEnd()}...`;
}

function toJsonFriendlyValue(value: unknown): JsonFriendlyValue {
    if (value === undefined || value === null || value === '') return null;
    if (isDateLike(value)) return value.toISOString();
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'bigint') return value.toString();
    if (Array.isArray(value)) return value.map(toJsonFriendlyValue);
    if (typeof value === 'object') {
        if ('toJSON' in value && typeof value.toJSON === 'function') {
            return toJsonFriendlyValue(value.toJSON());
        }

        if ('toString' in value && value.toString !== Object.prototype.toString) {
            return value.toString();
        }

        try {
            const serialized = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
            return Object.fromEntries(
                Object.entries(serialized).map(([key, entryValue]) => [
                    key,
                    toJsonFriendlyValue(entryValue),
                ])
            );
        } catch {
            return String(value);
        }
    }

    return String(value);
}

export function normalizeActivitySubject(subject: ActivitySubject) {
    if (typeof subject === 'string') {
        return { displayName: subject.trim() || 'record' };
    }

    return {
        ...(subject.label ? { label: subject.label } : {}),
        displayName: subject.name.trim() || 'record',
    };
}

export function formatActivityValue(value: unknown): string {
    if (value === undefined || value === null || value === '') return 'none';
    if (isDateLike(value)) return value.toISOString().slice(0, 10);
    if (Array.isArray(value))
        return value.length ? value.map(formatActivityValue).join(', ') : 'none';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
        if ('toString' in value && value.toString !== Object.prototype.toString) {
            return value.toString();
        }

        return 'updated';
    }
    return String(value);
}

export function formatEnumActivityValue(value: unknown): string {
    const formatted = formatActivityValue(value);
    if (formatted === 'none') return formatted;

    return formatted
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function activityChange(
    label: string,
    from: unknown,
    to: unknown,
    formatter: ActivityValueFormatter = formatActivityValue,
    options: ActivityChangeOptions = {}
): ActivityChange | null {
    if (toComparable(from) === toComparable(to)) return null;

    return {
        key: options.key ?? toActivityKey(label),
        label,
        ...(options.section ? { section: options.section } : {}),
        ...(options.valueType ? { valueType: options.valueType } : {}),
        from: formatter(from),
        to: formatter(to),
        rawFrom: from,
        rawTo: to,
    };
}

type ActivityCollectionFieldConfig<TItem> = {
    key: string;
    label: string;
    valueType?: ActivityValueType;
    formatter?: ActivityValueFormatter;
    getValue?: (item: TItem) => unknown;
};

export type ActivityCollectionChangeOptions<TItem> = ActivityChangeOptions & {
    itemLabel: string;
    fields: ActivityCollectionFieldConfig<TItem>[];
    getItemKey?: (item: TItem, index: number) => string;
    getItemLabel?: (item: TItem, index: number) => string;
};

function pluralizeActivityItem(label: string, count: number): string {
    return `${count} ${label}${count === 1 ? '' : 's'}`;
}

function getCollectionFieldValue<TItem>(
    item: TItem,
    field: ActivityCollectionFieldConfig<TItem>
): unknown {
    if (field.getValue) return field.getValue(item);
    return (item as Record<string, unknown>)[field.key];
}

function summarizeCollectionDiff(collection: ActivityCollectionDiff): string {
    const parts = [
        collection.addedCount ? `${collection.addedCount} added` : null,
        collection.removedCount ? `${collection.removedCount} removed` : null,
        collection.modifiedCount ? `${collection.modifiedCount} changed` : null,
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : 'changed';
}

export function activityCollectionChange<TItem>(
    label: string,
    fromItems: TItem[],
    toItems: TItem[],
    options: ActivityCollectionChangeOptions<TItem>
): ActivityChange | null {
    const makeRows = (items: TItem[]) =>
        items.map((item, index) => ({
            item,
            index,
            key: options.getItemKey?.(item, index) ?? String(index + 1),
            label: options.getItemLabel?.(item, index) ?? `${options.itemLabel} ${index + 1}`,
        }));

    const fromRows = makeRows(fromItems);
    const toRows = makeRows(toItems);
    const fromByKey = new Map(fromRows.map((row) => [row.key, row]));
    const toByKey = new Map(toRows.map((row) => [row.key, row]));
    const orderedKeys = [
        ...fromRows.map((row) => row.key),
        ...toRows.filter((row) => !fromByKey.has(row.key)).map((row) => row.key),
    ];

    const rows: ActivityCollectionChangeRow[] = [];

    for (const key of orderedKeys) {
        const before = fromByKey.get(key);
        const after = toByKey.get(key);

        if (!before && after) {
            rows.push({
                key,
                label: after.label,
                status: 'added',
                fields: options.fields.map((field) => {
                    const nextValue = getCollectionFieldValue(after.item, field);
                    const formatter = field.formatter ?? formatActivityValue;
                    return {
                        key: field.key,
                        label: field.label,
                        ...(field.valueType ? { valueType: field.valueType } : {}),
                        from: formatter(null),
                        to: formatter(nextValue),
                        rawFrom: null,
                        rawTo: nextValue,
                    };
                }),
            });
            continue;
        }

        if (before && !after) {
            rows.push({
                key,
                label: before.label,
                status: 'removed',
                fields: options.fields.map((field) => {
                    const previousValue = getCollectionFieldValue(before.item, field);
                    const formatter = field.formatter ?? formatActivityValue;
                    return {
                        key: field.key,
                        label: field.label,
                        ...(field.valueType ? { valueType: field.valueType } : {}),
                        from: formatter(previousValue),
                        to: formatter(null),
                        rawFrom: previousValue,
                        rawTo: null,
                    };
                }),
            });
            continue;
        }

        if (!before || !after) continue;

        const fields = options.fields
            .map((field) => {
                const previousValue = getCollectionFieldValue(before.item, field);
                const nextValue = getCollectionFieldValue(after.item, field);
                if (toComparable(previousValue) === toComparable(nextValue)) return null;

                const formatter = field.formatter ?? formatActivityValue;
                return {
                    key: field.key,
                    label: field.label,
                    ...(field.valueType ? { valueType: field.valueType } : {}),
                    from: formatter(previousValue),
                    to: formatter(nextValue),
                    rawFrom: previousValue,
                    rawTo: nextValue,
                };
            })
            .filter((field): field is ActivityCollectionChangeField => Boolean(field));

        if (fields.length) {
            rows.push({
                key,
                label: after.label,
                status: 'modified',
                fields,
            });
        }
    }

    if (rows.length === 0) return null;

    const collection: ActivityCollectionDiff = {
        itemLabel: options.itemLabel,
        addedCount: rows.filter((row) => row.status === 'added').length,
        removedCount: rows.filter((row) => row.status === 'removed').length,
        modifiedCount: rows.filter((row) => row.status === 'modified').length,
        rows,
    };

    return {
        key: options.key ?? toActivityKey(label),
        label,
        section: options.section,
        valueType: 'collection',
        from: pluralizeActivityItem(options.itemLabel, fromItems.length),
        to: `${pluralizeActivityItem(options.itemLabel, toItems.length)} (${summarizeCollectionDiff(
            collection
        )})`,
        rawFrom: fromItems,
        rawTo: toItems,
        collection,
    };
}

export function buildFieldUpdateActivityDescription(
    subject: ActivitySubject,
    revision: number,
    options: { maxLength?: number } = {}
): string {
    const { displayName } = normalizeActivitySubject(subject);
    const maxLength = options.maxLength ?? MAX_ACTIVITY_DESCRIPTION_LENGTH;

    return truncateActivityDescription(`Edited ${displayName} - rev ${revision}`, maxLength);
}

function toActivityFieldDiffCollection(
    collection: ActivityCollectionDiff
): ActivityFieldDiffCollection {
    return {
        itemLabel: collection.itemLabel,
        addedCount: collection.addedCount,
        removedCount: collection.removedCount,
        modifiedCount: collection.modifiedCount,
        rows: collection.rows.map((row) => ({
            key: row.key,
            label: row.label,
            status: row.status,
            fields: row.fields.map((field) => ({
                key: field.key,
                label: field.label,
                ...(field.valueType ? { valueType: field.valueType } : {}),
                from: {
                    raw: toJsonFriendlyValue(field.rawFrom),
                    display: field.from,
                },
                to: {
                    raw: toJsonFriendlyValue(field.rawTo),
                    display: field.to,
                },
            })),
        })),
    };
}

export function buildFieldDiffActivityDetails(
    subject: ActivitySubject,
    revision: number,
    changes: ActivityChange[]
): ActivityFieldDiffDetails {
    const normalizedSubject = normalizeActivitySubject(subject);

    return {
        kind: 'field-diff',
        schemaVersion: 1,
        subject: normalizedSubject,
        revision,
        changes: changes.map((change) => ({
            key: change.key,
            label: change.label,
            section: change.section ?? DEFAULT_ACTIVITY_CHANGE_SECTION,
            ...(change.valueType ? { valueType: change.valueType } : {}),
            from: {
                raw: toJsonFriendlyValue(change.rawFrom),
                display: change.from,
            },
            to: {
                raw: toJsonFriendlyValue(change.rawTo),
                display: change.to,
            },
            ...(change.collection
                ? { collection: toActivityFieldDiffCollection(change.collection) }
                : {}),
        })),
    };
}

export function buildUpdateActivityDescription(
    subject: string,
    changes: Array<ActivityChange | null | undefined>,
    options: { maxLength?: number } = {}
): string {
    const filteredChanges = changes.filter((change): change is ActivityChange => Boolean(change));
    const base = `Updated ${subject}`;
    const maxLength = options.maxLength ?? MAX_ACTIVITY_DESCRIPTION_LENGTH;
    if (filteredChanges.length === 0) return truncateActivityDescription(base, maxLength);

    const parts = filteredChanges.map(
        (change) => `${change.label} changed from ${change.from} to ${change.to}`
    );
    let description = `${base}: `;
    let included = 0;

    for (const part of parts) {
        const nextDescription = `${description}${included > 0 ? '; ' : ''}${part}`;
        if (nextDescription.length > maxLength) break;

        description = nextDescription;
        included += 1;
    }

    const remaining = parts.length - included;
    if (remaining > 0) {
        const moreText = `${included > 0 ? '; ' : ''}and ${remaining} more ${
            remaining === 1 ? 'change' : 'changes'
        }`;
        const nextDescription = `${description}${moreText}`;
        description =
            nextDescription.length <= maxLength
                ? nextDescription
                : truncateActivityDescription(description, maxLength);
    }

    return truncateActivityDescription(description.trimEnd(), maxLength);
}
