import { useMemo, useState } from 'react';

import type { ActivityFieldDiffDetails } from '@/app/api/activity-log.api';
import {
  ActivityRevisionBadge,
  stripActivityRevisionSuffix,
} from '@/app/components/activity-revision-badge';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { cn } from '@/app/lib/utils';
import { ListTree } from 'lucide-react';

interface ActivityChangeDetailsButtonProps {
  details?: ActivityFieldDiffDetails | null;
  summary?: string;
  actor?: string;
  timestamp?: string;
  className?: string;
  buttonLabel?: string;
}

interface ActivityChangeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: ActivityFieldDiffDetails;
  summary?: string;
  actor?: string;
  timestamp?: string;
}

type ActivityChange = ActivityFieldDiffDetails['changes'][number];
type ActivityCollectionRow = NonNullable<ActivityChange['collection']>['rows'][number];

export function ActivityChangeDetailsButton({
  details,
  summary,
  actor,
  timestamp,
  className,
  buttonLabel = 'View details',
}: ActivityChangeDetailsButtonProps) {
  const [open, setOpen] = useState(false);

  if (!details) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('mt-2 h-7 px-2 text-xs text-primary hover:text-primary', className)}
        onClick={() => setOpen(true)}
      >
        <ListTree className="size-3.5" />
        {buttonLabel}
      </Button>
      <ActivityChangeDetailsDialog
        open={open}
        onOpenChange={setOpen}
        details={details}
        summary={summary}
        actor={actor}
        timestamp={timestamp}
      />
    </>
  );
}

function ActivityChangeDetailsDialog({
  open,
  onOpenChange,
  details,
  summary,
  actor,
  timestamp,
}: ActivityChangeDetailsDialogProps) {
  const sections = useMemo(() => groupChangesBySection(details), [details]);
  const title = stripActivityRevisionSuffix(
    summary ?? `Edited ${details.subject.displayName}`,
    details.revision
  );
  const meta = [actor ? `Changed by ${actor}` : null, timestamp].filter(Boolean).join(' / ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] w-[calc(100vw-2rem)] max-w-5xl gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogHeader className="mb-0 border-b border-border px-5 py-4 pe-12 text-start">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <DialogTitle className="min-w-0 truncate text-base">{title}</DialogTitle>
            <ActivityRevisionBadge revision={details.revision} />
          </div>
          <DialogDescription className="mt-1 flex flex-col gap-1 text-xs sm:flex-row sm:items-center">
            {details.subject.label && <span>{details.subject.label}</span>}
            {details.subject.label && meta && (
              <span className="hidden text-border sm:inline">/</span>
            )}
            {meta && <span>{meta}</span>}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="min-h-0 overflow-y-auto p-4">
          <div className="mb-4 rounded-md border border-border bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
            {details.changes.length} changed field{details.changes.length === 1 ? '' : 's'}
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <ActivityChangeSection key={section.name} section={section} />
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function ActivityChangeSection({
  section,
}: {
  section: { name: string; changes: ActivityChange[] };
}) {
  const scalarChanges = section.changes.filter((change) => !change.collection);
  const collectionChanges = section.changes.filter((change) => change.collection);

  return (
    <section className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">{section.name}</h3>
        <span className="text-xs text-muted-foreground">
          {section.changes.length} field{section.changes.length === 1 ? '' : 's'}
        </span>
      </div>

      {scalarChanges.length > 0 && <ScalarChangesTable changes={scalarChanges} />}

      {collectionChanges.length > 0 && (
        <div className="divide-y divide-border">
          {collectionChanges.map((change) => (
            <CollectionChangeCard key={change.key} change={change} />
          ))}
        </div>
      )}
    </section>
  );
}

function ScalarChangesTable({ changes }: { changes: ActivityChange[] }) {
  return (
    <>
      <div className="hidden md:block">
        <div className="grid grid-cols-[minmax(9rem,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Field</span>
          <span>Before</span>
          <span>After</span>
        </div>
        {changes.map((change) => (
          <div
            key={change.key}
            className="grid grid-cols-[minmax(9rem,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border px-3 py-3 last:border-b-0"
          >
            <FieldLabel label={change.label} fieldKey={change.key} />
            <ChangeValue display={change.from.display} tone="before" />
            <ChangeValue display={change.to.display} tone="after" />
          </div>
        ))}
      </div>

      <div className="divide-y divide-border md:hidden">
        {changes.map((change) => (
          <div key={change.key} className="space-y-3 p-3">
            <FieldLabel label={change.label} fieldKey={change.key} />
            <div className="grid gap-2">
              <LabeledChangeValue label="Before" display={change.from.display} tone="before" />
              <LabeledChangeValue label="After" display={change.to.display} tone="after" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CollectionChangeCard({ change }: { change: ActivityChange }) {
  const collection = change.collection;
  if (!collection) return null;

  return (
    <div className="space-y-3 p-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <FieldLabel label={change.label} fieldKey={change.key} />
        <div className="flex flex-wrap gap-1.5">
          {collection.addedCount > 0 && (
            <Badge variant="success" appearance="light" size="sm">
              {collection.addedCount} added
            </Badge>
          )}
          {collection.removedCount > 0 && (
            <Badge variant="destructive" appearance="light" size="sm">
              {collection.removedCount} removed
            </Badge>
          )}
          {collection.modifiedCount > 0 && (
            <Badge variant="info" appearance="light" size="sm">
              {collection.modifiedCount} changed
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {collection.rows.map((row) => (
          <CollectionRowCard key={row.key} row={row} />
        ))}
      </div>
    </div>
  );
}

function CollectionRowCard({ row }: { row: ActivityCollectionRow }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-foreground">{row.label}</p>
          <code className="break-all text-[0.6875rem] text-muted-foreground">{row.key}</code>
        </div>
        <CollectionStatusBadge status={row.status} />
      </div>

      <div className="divide-y divide-border">
        {row.fields.map((field) => (
          <div
            key={field.key}
            className="grid gap-2 px-3 py-3 md:grid-cols-[minmax(9rem,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-3"
          >
            <FieldLabel label={field.label} fieldKey={field.key} />
            <LabeledChangeValue label="Before" display={field.from.display} tone="before" />
            <LabeledChangeValue label="After" display={field.to.display} tone="after" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CollectionStatusBadge({ status }: { status: ActivityCollectionRow['status'] }) {
  const config = {
    added: { label: 'Added', variant: 'success' as const },
    removed: { label: 'Removed', variant: 'destructive' as const },
    modified: { label: 'Changed', variant: 'info' as const },
  }[status];

  return (
    <Badge variant={config.variant} appearance="light" size="sm">
      {config.label}
    </Badge>
  );
}

function groupChangesBySection(details: ActivityFieldDiffDetails) {
  const sections = new Map<string, ActivityFieldDiffDetails['changes']>();

  for (const change of details.changes) {
    const section = change.section || 'Changes';
    sections.set(section, [...(sections.get(section) ?? []), change]);
  }

  return Array.from(sections.entries()).map(([name, changes]) => ({ name, changes }));
}

function FieldLabel({ label, fieldKey }: { label: string; fieldKey: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="break-words text-sm font-medium text-foreground">{label}</p>
      <code className="break-all text-[0.6875rem] text-muted-foreground">{fieldKey}</code>
    </div>
  );
}

function LabeledChangeValue({
  label,
  display,
  tone,
}: {
  label: string;
  display: string;
  tone: 'before' | 'after';
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <ChangeValue display={display} tone={tone} />
    </div>
  );
}

function ChangeValue({ display, tone }: { display: string; tone: 'before' | 'after' }) {
  const isEmpty = !display || display === 'none';

  return (
    <div
      className={cn(
        'min-h-9 min-w-0 rounded-md border px-3 py-2 text-sm leading-relaxed',
        tone === 'after'
          ? 'border-primary/20 bg-primary/5 text-foreground'
          : 'border-border bg-muted/20 text-foreground',
        isEmpty && 'text-muted-foreground'
      )}
    >
      <span className="whitespace-pre-wrap break-words">{isEmpty ? 'None' : display}</span>
    </div>
  );
}
