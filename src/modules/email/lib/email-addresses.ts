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
