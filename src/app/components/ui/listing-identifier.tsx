import { type ComponentPropsWithoutRef, type ComponentType } from 'react';

import { cn } from '@/app/lib/utils';
import { ExternalLink, type LucideProps } from 'lucide-react';
import { Link, type LinkProps } from 'react-router-dom';

type ListingIdentifierValue = number | string | null | undefined;

const identifierClassName = 'font-semibold tabular-nums text-primary';
/**
 * Links read as `--link`, not `--primary`.
 *
 * `--primary` is the brand, and is what a filled button is painted with; an
 * identifier sharing it reads as decoration rather than as somewhere to go. The
 * link token is a lighter cyan chosen to sit clearly above body text while still
 * clearing WCAG AA at this size — see the note beside it in the theme files.
 */
const identifierLinkClassName = 'font-semibold tabular-nums text-link';
const missingIdentifierClassName = 'font-semibold tabular-nums text-muted-foreground';

function hasIdentifierValue(value: ListingIdentifierValue): value is number | string {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

function getIdentifierTitle(value: ListingIdentifierValue, title?: string) {
  if (title !== undefined) return title;
  return hasIdentifierValue(value) ? String(value) : undefined;
}

interface ListingIdentifierTextProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  value: ListingIdentifierValue;
  fallback?: string;
}

export function ListingIdentifierText({
  value,
  fallback = '-',
  className,
  title,
  ...props
}: ListingIdentifierTextProps) {
  const hasValue = hasIdentifierValue(value);

  return (
    <span
      title={getIdentifierTitle(value, title)}
      className={cn(className, hasValue ? identifierClassName : missingIdentifierClassName)}
      {...props}
    >
      {hasValue ? value : fallback}
    </span>
  );
}

interface ListingIdentifierLinkProps extends Omit<LinkProps, 'children'> {
  value: ListingIdentifierValue;
  fallback?: string;
  /**
   * Marks a link that opens a *different* record than the row it sits in — the
   * purchase order a change order belongs to, the RFQ a purchase order came
   * from. Those get an icon; a row's own identifier does not.
   *
   * The distinction is the point. In a list where every row's first cell is a
   * link, an icon on all of them says nothing. An icon on the one link that
   * leaves the list is worth reading.
   */
  crossRecord?: boolean;
  /** Overrides the mark a `crossRecord` link renders. */
  icon?: ComponentType<LucideProps>;
}

export function ListingIdentifierLink({
  value,
  fallback = '-',
  className,
  title,
  crossRecord = false,
  icon,
  ...props
}: ListingIdentifierLinkProps) {
  const hasValue = hasIdentifierValue(value);
  const Icon = hasValue && crossRecord ? (icon ?? ExternalLink) : undefined;

  return (
    <Link
      title={getIdentifierTitle(value, title)}
      className={cn(
        className,
        hasValue ? identifierLinkClassName : missingIdentifierClassName,
        // `inline-flex` so the icon sits on the identifier's baseline row rather
        // than wrapping under it, and `max-w-full` so a long identifier still
        // truncates inside whatever cell it was given.
        'inline-flex max-w-full items-center gap-1 transition-colors',
        hasValue && 'hover:text-link-hover'
      )}
      {...props}
    >
      <span className="truncate">{hasValue ? value : fallback}</span>
      {Icon && (
        // Decorative: the link is already named by the identifier beside it, so
        // announcing the icon would just repeat it.
        <Icon aria-hidden="true" className="size-3.5 shrink-0 opacity-70" strokeWidth={2.5} />
      )}
    </Link>
  );
}
