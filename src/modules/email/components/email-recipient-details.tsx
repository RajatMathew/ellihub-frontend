import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import type { EmailAddress, EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { ChevronDown, EyeOff } from 'lucide-react';

interface EmailRecipientDetailsProps {
  message: EmailThreadMessage;
}

export function EmailRecipientDetails({ message }: EmailRecipientDetailsProps) {
  const groups = getRecipientGroups(message);
  const recipientCount = groups.to.length + groups.cc.length + groups.bcc.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group -my-1 -ml-1 mt-0 flex min-h-10 max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs text-muted-foreground hover:text-foreground active:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-100"
          aria-label={`View message recipients: ${formatAccessibleSummary(groups)}`}
        >
          <span className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-hidden">
            <RecipientSummary label="To" recipients={groups.to} />
            {groups.cc.length > 0 && (
              <RecipientSummary label="Cc" recipients={groups.cc} secondary />
            )}
            {groups.bcc.length > 0 && (
              <RecipientSummary label="Bcc" recipients={groups.bcc} secondary />
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-3.5 shrink-0 opacity-60 motion-safe:transition-transform motion-safe:duration-150 group-data-[state=open]:rotate-180"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Message recipients</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}
          </p>
        </div>

        <div className="space-y-3 p-4">
          <RecipientGroup
            label="From"
            recipients={[{ name: message.senderName, address: message.senderEmail }]}
          />
          <RecipientGroup label="To" recipients={groups.to} />
          {groups.cc.length > 0 && <RecipientGroup label="Cc" recipients={groups.cc} />}
          {groups.bcc.length > 0 && (
            <div className="space-y-2">
              <RecipientGroup label="Bcc" recipients={groups.bcc} />
              <p className="flex items-start gap-1.5 pl-10 text-xs leading-4 text-muted-foreground">
                <EyeOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                Hidden from other recipients
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RecipientSummary({
  label,
  recipients,
  secondary = false,
}: {
  label: string;
  recipients: EmailAddress[];
  secondary?: boolean;
}) {
  return (
    <span
      className={
        secondary
          ? 'inline-flex min-w-0 shrink items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5'
          : 'inline-flex min-w-0 shrink items-center gap-1'
      }
    >
      <span className="shrink-0 font-medium">{label}:</span>
      <span className="max-w-40 truncate text-foreground">{formatCompactGroup(recipients)}</span>
    </span>
  );
}

function RecipientGroup({ label, recipients }: { label: string; recipients: EmailAddress[] }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-8 shrink-0 pt-1 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 space-y-1">
        {recipients.map((recipient, index) => (
          <div
            key={`${recipient.address.toLowerCase()}-${index}`}
            className="rounded-md bg-muted/60 px-2.5 py-1.5"
          >
            {recipient.name && recipient.name.toLowerCase() !== recipient.address.toLowerCase() && (
              <span className="block truncate text-xs font-medium text-foreground">
                {recipient.name}
              </span>
            )}
            <span className="block break-all text-xs text-muted-foreground">
              {recipient.address}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getRecipientGroups(message: EmailThreadMessage) {
  const fallbackRecipient = {
    name: normalizeName(message.recipientName, message.recipientEmail),
    address: message.recipientEmail.trim(),
  };
  const to = normalizeRecipients(message.to);

  return {
    to: to.length > 0 ? to : fallbackRecipient.address ? [fallbackRecipient] : [],
    cc: normalizeRecipients(message.cc),
    bcc: normalizeRecipients(message.bcc),
  };
}

function normalizeRecipients(recipients?: EmailAddress[]) {
  return (recipients ?? [])
    .map((recipient) => ({
      address: recipient.address.trim(),
      name: normalizeName(recipient.name, recipient.address),
    }))
    .filter((recipient) => recipient.address);
}

function normalizeName(name: string | undefined, address: string) {
  const normalized = name?.trim();
  if (
    !normalized ||
    normalized === 'Elli Team' ||
    normalized.toLowerCase() === address.toLowerCase()
  ) {
    return undefined;
  }
  return normalized;
}

function formatCompactGroup(recipients: EmailAddress[]) {
  const [first, ...rest] = recipients;
  if (!first) return 'Unknown recipient';
  const firstLabel = first.name || first.address;
  return rest.length > 0 ? `${firstLabel} +${rest.length}` : firstLabel;
}

function formatAccessibleSummary(groups: ReturnType<typeof getRecipientGroups>) {
  return [
    `To ${groups.to.map(formatAddress).join(', ') || 'unknown recipient'}`,
    groups.cc.length > 0 ? `Cc ${groups.cc.map(formatAddress).join(', ')}` : '',
    groups.bcc.length > 0 ? `Bcc ${groups.bcc.map(formatAddress).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

function formatAddress(recipient: EmailAddress) {
  return recipient.name ? `${recipient.name} at ${recipient.address}` : recipient.address;
}
