import {
  getReferenceIdentity,
  type EntityReference,
  type EntityReferenceType,
} from '@/app/components/entity-reference-marker-storage';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/app/components/ui/hover-card';
import { cn } from '@/app/lib/utils';
import { splitReferenceLabel } from '@/modules/email/lib/email-reference-label';
import { ArrowUpRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

/** The order records are listed in, and the colour each type's dot carries. */
const TYPE_ORDER: Array<{ type: EntityReferenceType; label: string; dot: string }> = [
  { type: 'project', label: 'JOB', dot: 'bg-court-ours' },
  { type: 'rfq', label: 'RFQ', dot: 'bg-warning' },
  { type: 'rfi', label: 'RFI', dot: 'bg-caution' },
  { type: 'purchaseOrder', label: 'PO', dot: 'bg-primary' },
  { type: 'changeOrder', label: 'SCO', dot: 'bg-priority-low' },
  { type: 'invoice', label: 'INVOICE', dot: 'bg-foreground' },
];

/**
 * The records a thread is linked to.
 *
 * One row per kind, the records stacked under it rather than fitted across it.
 * The shared `ReferenceGroups` measures chips and hides the overflow behind a
 * "+3 more", which works in a wide row and not at all in a 288px side panel —
 * it meant a thread linked to five jobs showed one of them (elli-ui#921).
 */
export function MailLinkedItems({
  references,
  isSaving,
  onRemove,
}: {
  references: EntityReference[];
  isSaving?: boolean;
  onRemove: (reference: EntityReference) => void;
}) {
  const groups = TYPE_ORDER.map((group) => ({
    ...group,
    references: references.filter((reference) => reference.type === group.type),
  })).filter((group) => group.references.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="divide-y divide-mail-hair">
      {groups.map((group) => (
        <div key={group.type} className="flex min-w-0 items-start gap-3 py-3">
          <span className="flex w-[68px] shrink-0 items-center gap-1.5 pt-1.5 text-[10.5px] font-bold tracking-[0.03em] text-mail-mid">
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', group.dot)} />
            {group.label}
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            {group.references.map((reference) => (
              <LinkedItemChip
                key={getReferenceIdentity(reference)}
                reference={reference}
                typeLabel={group.label}
                isSaving={isSaving}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkedItemChip({
  reference,
  typeLabel,
  isSaving,
  onRemove,
}: {
  reference: EntityReference;
  typeLabel: string;
  isSaving?: boolean;
  onRemove: (reference: EntityReference) => void;
}) {
  const { code, name } = splitReferenceLabel(reference.label);
  // Only a project resolves to a page on its own: every other record lives
  // under a project route, and a reference does not carry which project.
  const href =
    reference.type === 'project' && reference.entityId
      ? `/app/project/${reference.entityId}`
      : null;

  return (
    <HoverCard openDelay={200} closeDelay={80}>
      <HoverCardTrigger asChild>
        <span className="group/linked -mx-1.5 flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-mail-paper">
          <span className="min-w-0 truncate text-[13px] text-mail-mid">
            <span className="font-bold text-mail-ink">{code}</span>
            {name && (
              <>
                <span className="mx-1 text-mail-muted">–</span>
                {name}
              </>
            )}
          </span>
          <button
            type="button"
            aria-label={`Remove ${reference.label}`}
            disabled={isSaving}
            className="grid size-4 shrink-0 cursor-pointer place-items-center rounded text-mail-muted opacity-0 hover:bg-mail-chip hover:text-mail-ink focus-visible:opacity-100 focus-visible:outline-hidden group-hover/linked:opacity-70 disabled:pointer-events-none disabled:opacity-25"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onRemove(reference)}
          >
            <X aria-hidden="true" className="size-2.5" strokeWidth={2.4} />
          </button>
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="start" className="w-64 rounded-xl p-3.5">
        <p className="text-[10.5px] font-semibold tracking-[0.04em] text-mail-muted">
          {typeLabel} · {code}
        </p>
        <p className="mt-1 text-[13.5px] font-semibold leading-snug text-mail-ink">
          {name ?? code}
        </p>
        {href ? (
          <Link
            to={href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 border-t border-mail-hair pt-2.5 text-xs font-semibold text-link hover:underline"
          >
            Open in new tab
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </Link>
        ) : (
          // Every other kind of record lives under a project route, and a
          // reference does not carry which project — so there is no URL to
          // offer rather than a link that guesses one.
          <p className="mt-3 border-t border-mail-hair pt-2.5 text-center text-[11px] text-mail-muted">
            Open from the project this belongs to
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
