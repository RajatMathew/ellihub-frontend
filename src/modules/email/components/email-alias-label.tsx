import { cn } from '@/app/lib/utils';

const EMAIL_ALIAS_SUFFIX = '@ellicorp.com';
const MAX_VISIBLE_LOCAL_PART_LENGTH = 12;

interface EmailAliasLabelProps {
  value: string;
  className?: string;
}

export function EmailAliasLabel({ value, className }: EmailAliasLabelProps) {
  const isElliAlias = value.toLowerCase().endsWith(EMAIL_ALIAS_SUFFIX);

  if (!isElliAlias) {
    return (
      <span className={cn('min-w-0 flex-1 truncate', className)} title={value}>
        {value}
      </span>
    );
  }

  const localPart = value.slice(0, -EMAIL_ALIAS_SUFFIX.length);
  const visibleLocalPart =
    localPart.length > MAX_VISIBLE_LOCAL_PART_LENGTH
      ? `${localPart.slice(0, MAX_VISIBLE_LOCAL_PART_LENGTH)}..`
      : localPart;

  return (
    <span
      data-slot="email-alias-label"
      className={cn(
        'flex w-full min-w-0 max-w-full flex-1 overflow-hidden whitespace-nowrap',
        className
      )}
      title={value}
    >
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">{visibleLocalPart}</span>
      <span className="shrink-0">{EMAIL_ALIAS_SUFFIX}</span>
    </span>
  );
}
