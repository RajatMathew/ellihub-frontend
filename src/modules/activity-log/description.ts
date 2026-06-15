const MAX_ACTIVITY_DESCRIPTION_LENGTH = 500;

type ActivityValueFormatter = (value: unknown) => string;

export type ActivityChange = {
    label: string;
    from: string;
    to: string;
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

function truncateActivityDescription(description: string, maxLength: number): string {
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength - 3).trimEnd()}...`;
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
    formatter: ActivityValueFormatter = formatActivityValue
): ActivityChange | null {
    if (toComparable(from) === toComparable(to)) return null;

    return {
        label,
        from: formatter(from),
        to: formatter(to),
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
