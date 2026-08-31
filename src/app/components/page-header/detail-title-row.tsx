import type { ReactNode } from 'react';

import { StatusBadge } from '@/app/components/status-badge';
import { Badge } from '@/app/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/app/components/ui/select';
import { Link } from 'react-router-dom';

import type { BadgeDef, ReferenceDef, StatusDef } from './page-header.types';

interface DetailTitleRowProps {
  status?: StatusDef;
  badges?: BadgeDef[];
  references?: ReferenceDef[];
  /** Genuine one-offs that carry their own logic, e.g. an email-sent badge. */
  titleSlot?: ReactNode;
}

function EditableStatus({ status }: { status: StatusDef }) {
  const badge = <StatusBadge label={status.label} status={status.value} tones={status.tones} />;

  return (
    <Select
      disabled={status.pending}
      value={status.selectedId ?? status.value ?? ''}
      onValueChange={(id) => {
        if (id !== (status.selectedId ?? status.value)) status.onChange?.(id);
      }}
    >
      {/* `w-auto` matters: the trigger is full-width by default, which strands
          the chevron at the far edge of the header and wraps the badge onto its
          own line. It has to hug the badge to read as one control. */}
      <SelectTrigger
        aria-label="Change status"
        className="h-auto w-auto gap-1.5 rounded-md border-none bg-transparent p-0 focus:ring-0 [&>svg]:size-3.5"
      >
        {badge}
      </SelectTrigger>
      <SelectContent>
        {status.options?.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * What sits beside a detail page's title.
 *
 * Four kinds of thing land here and they are not interchangeable, so each gets
 * its own prop rather than sharing one `ReactNode` slot: the lifecycle status,
 * qualifier badges, links to related records, and the page's own one-offs. When
 * they shared a slot, seven detail pages each invented their own arrangement.
 *
 * Order is fixed — status, badges, references — so two records never present
 * the same information in a different sequence.
 */
export function DetailTitleRow({ status, badges, references, titleSlot }: DetailTitleRowProps) {
  const isEditable = Boolean(status?.options?.length && status.onChange);

  return (
    <>
      {status ? (
        isEditable ? (
          <EditableStatus status={status} />
        ) : (
          <StatusBadge label={status.label} status={status.value} tones={status.tones} />
        )
      ) : null}

      {badges?.map((badge) => {
        const Icon = badge.icon;

        return (
          <Badge
            key={badge.label}
            variant={badge.variant ?? 'primary'}
            appearance="outline"
            size="sm"
          >
            {Icon && <Icon className="size-3" />}
            {badge.label}
          </Badge>
        );
      })}

      {references?.map((reference) => (
        <Link key={reference.to} to={reference.to} className="text-xs text-primary hover:underline">
          {reference.label}
        </Link>
      ))}

      {titleSlot}
    </>
  );
}
