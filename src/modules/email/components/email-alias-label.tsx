import { cn } from '@/app/lib/utils';

const EMAIL_ALIAS_SUFFIX = '@ellicorp.com';

interface EmailAliasLabelProps {
  value: string;
  className?: string;
}

export function EmailAliasLabel({ value, className }: EmailAliasLabelProps) {
  return (
    <span
      data-slot="email-alias-label"
      className={cn('block w-0 min-w-0 flex-1 basis-0 truncate whitespace-nowrap', className)}
      title={value}
    >
      {value}
    </span>
  );
}

export function MailboxEmailAliasLabel({ value, className }: EmailAliasLabelProps) {
  const isElliAlias = value.toLowerCase().endsWith(EMAIL_ALIAS_SUFFIX);

  if (!isElliAlias) {
    return (
      <span className={cn('min-w-0 flex-1 truncate', className)} title={value}>
        {value}
      </span>
    );
  }

  const localPart = value.slice(0, -EMAIL_ALIAS_SUFFIX.length);

  return (
    <span
      data-slot="mailbox-email-alias-label"
      className={cn(
        'inline-flex w-full min-w-0 max-w-full flex-1 overflow-hidden whitespace-nowrap',
        className
      )}
      title={value}
    >
      <span className="min-w-0 overflow-hidden text-ellipsis">{localPart}</span>
      <span className="shrink-0">{EMAIL_ALIAS_SUFFIX}</span>
    </span>
  );
}
