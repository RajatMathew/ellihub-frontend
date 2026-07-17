import { type ComponentPropsWithoutRef } from 'react';

import { cn } from '@/app/lib/utils';
import { Link, type LinkProps } from 'react-router-dom';

type ListingIdentifierValue = number | string | null | undefined;

const identifierClassName = 'font-semibold tabular-nums text-primary';
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
}

export function ListingIdentifierLink({
  value,
  fallback = '-',
  className,
  title,
  ...props
}: ListingIdentifierLinkProps) {
  const hasValue = hasIdentifierValue(value);

  return (
    <Link
      title={getIdentifierTitle(value, title)}
      className={cn(
        className,
        hasValue ? identifierClassName : missingIdentifierClassName,
        'transition-colors',
        hasValue && 'hover:text-primary/80'
      )}
      {...props}
    >
      {hasValue ? value : fallback}
    </Link>
  );
}
