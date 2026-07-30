export type ParsedEmailAddress = {
  address: string;
  name?: string;
};

const EMAIL_ADDRESS_PATTERN = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;

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

function splitEmailAddresses(value: string) {
  return value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}
