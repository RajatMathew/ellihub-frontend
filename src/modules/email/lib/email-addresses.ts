export type ParsedEmailAddress = {
  address: string;
  name?: string;
};

export const EMAIL_ADDRESS_PATTERN = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;

export function parseEmailAddresses(value: string): ParsedEmailAddress[] {
  return splitEmailAddresses(value).map((recipient) => {
    const match = recipient.match(/^(.*?)\s*<([^<>]+)>$/);
    if (!match) return { address: recipient };

    return {
      address: match[2].trim(),
      name: match[1].trim().replace(/^["']|["']$/g, '') || undefined,
    };
  });
}

export function getEmailAddressListError(
  value: string,
  label: string,
  required = false
): string | null {
  const recipients = parseEmailAddresses(value);

  if (required && recipients.length === 0) {
    return label === 'To'
      ? 'Add at least one recipient.'
      : `Add at least one ${label.toLowerCase()} address.`;
  }

  const invalidRecipient = recipients.find(
    (recipient) => !EMAIL_ADDRESS_PATTERN.test(recipient.address)
  );
  if (!invalidRecipient) return null;

  return `Finish or remove “${invalidRecipient.address}” before continuing.`;
}

/**
 * True when `value` is one complete address — either `a@b.com` or
 * `Name <a@b.com>`. Anything else (bare text, a half-typed address, a list)
 * is rejected, so chip inputs can refuse to commit it.
 */
export function isValidEmailAddress(value: string): boolean {
  const parsed = parseEmailAddresses(value);
  return parsed.length === 1 && EMAIL_ADDRESS_PATTERN.test(parsed[0].address);
}

/**
 * Splits a typed or pasted blob into the addresses that are complete and the
 * fragments that are not, preserving the order the user supplied. Callers
 * commit `valid` and hand `invalid` back to the user to fix rather than
 * dropping it.
 */
export function partitionEmailAddresses(value: string): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const candidate of splitAddressCandidates(value)) {
    if (isValidEmailAddress(candidate)) valid.push(candidate);
    else invalid.push(candidate);
  }
  return { valid, invalid };
}

export type AddressChipCommit = {
  /** The chip list after the commit. Unchanged when nothing was complete. */
  chips: string[];
  /** Text that must stay in the input — never silently dropped. */
  buffer: string;
  /** Inline message for the field, or `null` when everything committed. */
  error: string | null;
};

/** Field-level copy for a fragment that is not a complete address. */
export function incompleteEmailAddressMessage(text: string): string {
  return `“${text}” is not a complete email address. Recipients look like name@company.com.`;
}

/**
 * The single decision every commit path in a recipient chip input runs
 * through — Enter, Tab, a typed separator, a paste, and blur.
 *
 * Only complete addresses become chips. Anything else stays in `buffer` with
 * an `error` explaining why, so a stray word can neither turn into a chip nor
 * be thrown away behind the user's back. The predicate is the same
 * `EMAIL_ADDRESS_PATTERN` that `getEmailAddressListError` gates sending on, so
 * the field can never accept something send would later reject.
 *
 * `pending` is the tail the user is still typing after the last separator. It
 * is carried back into the buffer unjudged — mid-word is not an error yet.
 */
export function commitAddressChips(chips: string[], text: string, pending = ''): AddressChipCommit {
  const { valid, invalid } = partitionEmailAddresses(text);

  // Deduplicate on the parsed address so a suggestion pick that arrives as
  // `Name <a@b.com>` does not double up a chip already typed as `a@b.com`.
  const seen = new Set(chips.map(addressOf));
  const additions: string[] = [];
  for (const candidate of valid) {
    const address = addressOf(candidate);
    if (seen.has(address)) continue;
    seen.add(address);
    additions.push(candidate);
  }

  const tail = pending.trim();
  return {
    chips: additions.length ? [...chips, ...additions] : chips,
    buffer: [...invalid, tail].filter(Boolean).join(', '),
    error: invalid.length ? incompleteEmailAddressMessage(invalid[0]) : null,
  };
}

/**
 * Whether a space just typed finishes an address, the way a comma does. Only
 * a complete one: `John ` is the start of `John Smith <j@x.com>`, and a
 * `Name <address>` pair holds spaces of its own.
 */
export function endsWithCompleteAddress(raw: string): boolean {
  if (!/\s$/.test(raw) || raw.includes('<')) return false;
  const last = raw.trim().split(/\s+/).pop() ?? '';
  return EMAIL_ADDRESS_PATTERN.test(last);
}

function addressOf(text: string): string {
  return parseEmailAddresses(text)[0]?.address ?? text.trim();
}

/** Renders a parsed address back to the `Name <address>` text form. */
export function formatEmailAddress({ address, name }: ParsedEmailAddress): string {
  return name ? `${name} <${address}>` : address;
}

function splitEmailAddresses(value: string) {
  return value
    .split(/[;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Paste-friendly split. Commas, semicolons and newlines always separate;
 * spaces separate too, but only inside a fragment that is not a
 * `Name <address>` pair — those legitimately contain spaces.
 */
function splitAddressCandidates(value: string): string[] {
  return splitEmailAddresses(value)
    .flatMap((part) => (part.includes('<') ? [part] : part.split(/\s+/)))
    .map((part) => part.trim())
    .filter(Boolean);
}
