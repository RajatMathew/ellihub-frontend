import type { EmailTemplate } from '@/modules/email/api';
import { templatePreview } from '@/modules/email/lib/email-templates';
import { Pencil, Trash2 } from 'lucide-react';

/**
 * One template in the popover: its name and first words, which insert it, and
 * — on hover or focus — edit and delete beside it.
 */
export function EmailTemplateRow({
  template,
  onUse,
  onEdit,
  onDelete,
}: {
  template: EmailTemplate;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group relative flex min-w-0 items-center rounded-md hover:bg-accent focus-within:bg-accent">
      <button
        type="button"
        onClick={onUse}
        className="min-w-0 flex-1 cursor-pointer rounded-md px-2.5 py-2 pe-16 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium text-foreground">{template.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {templatePreview(template.body) || 'Empty message'}
        </span>
      </button>
      <span className="absolute end-1.5 flex gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <RowAction label={`Edit ${template.name}`} onClick={onEdit}>
          <Pencil aria-hidden="true" className="size-3.5" />
        </RowAction>
        <RowAction label={`Delete ${template.name}`} onClick={onDelete}>
          <Trash2 aria-hidden="true" className="size-3.5" />
        </RowAction>
      </span>
    </li>
  );
}

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}
