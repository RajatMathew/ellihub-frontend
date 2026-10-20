import { useState } from 'react';

import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Input } from '@/app/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import type { EmailTemplate } from '@/modules/email/api';
import { EmailTemplateDialog } from '@/modules/email/components/compose/email-template-dialog';
import { EmailTemplateRow } from '@/modules/email/components/compose/email-template-row';
import {
  useDeleteEmailTemplateMutation,
  useEmailTemplatesQuery,
} from '@/modules/email/hooks/email-templates.hooks';
import { filterTemplates, insertEmailTemplate } from '@/modules/email/lib/email-templates';
import { FileText, Plus, Search } from 'lucide-react';

/**
 * Templates in the composer (elli-ui#668): a popover beside Send listing the
 * reader's templates. A click drops one into the body above the signature —
 * and, on a new email with no subject yet, fills the subject too. New, edit
 * and delete are all here, so templates are kept where they are used.
 */
export function EmailTemplatesMenu({
  body,
  onBodyChange,
  onSubjectFill,
  disabled = false,
  iconOnly = false,
}: {
  body: string;
  onBodyChange: (body: string) => void;
  /** A new email offers its subject; a reply keeps the thread's. */
  onSubjectFill?: (subject: string) => void;
  disabled?: boolean;
  /**
   * Just the icon — for the compact reply card, whose footer is already full:
   * with the word as well, the row outgrew the card and scrolled it sideways.
   */
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EmailTemplate | 'new' | null>(null);
  const [deleting, setDeleting] = useState<EmailTemplate | null>(null);
  const templates = useEmailTemplatesQuery(open);
  const remove = useDeleteEmailTemplateMutation();
  const shown = filterTemplates(templates.data ?? [], search);

  const use = (template: EmailTemplate) => {
    onBodyChange(insertEmailTemplate(body, template.body));
    if (template.subject) onSubjectFill?.(template.subject);
    setOpen(false);
  };
  const openEditor = (target: EmailTemplate | 'new') => {
    setOpen(false);
    setEditing(target);
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSearch('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Templates"
            title={iconOnly ? 'Templates' : undefined}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-mail-muted hover:bg-accent hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-mail-ink"
          >
            <FileText aria-hidden="true" className="size-3.5" />
            {!iconOnly && 'Templates'}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          className="w-80 p-0"
          // Inside the composer's form in React's tree: its keys stay here.
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search templates"
                aria-label="Search templates"
                className="h-8 ps-8"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {templates.isLoading ? (
              <div className="space-y-1.5 p-1.5" aria-label="Loading templates">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-10 w-full" />
                ))}
              </div>
            ) : templates.isError ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Couldn’t load your templates.{' '}
                <button
                  type="button"
                  className="cursor-pointer text-link hover:underline"
                  onClick={() => void templates.refetch()}
                >
                  Try again
                </button>
              </p>
            ) : shown.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {search ? 'No template matches.' : 'No templates yet.'}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {shown.map((template) => (
                  <EmailTemplateRow
                    key={template.id}
                    template={template}
                    onUse={() => use(template)}
                    onEdit={() => openEditor(template)}
                    onDelete={() => {
                      setOpen(false);
                      setDeleting(template);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={() => openEditor('new')}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-link',
                'hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <Plus aria-hidden="true" className="size-4" />
              New template
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {editing && (
        <EmailTemplateDialog
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {/* Its keys stay here too, rather than reaching the composer's form. */}
      <span className="contents" onKeyDown={(event) => event.stopPropagation()}>
        <ConfirmDialog
          open={deleting !== null}
          onOpenChange={(next) => {
            if (!next) setDeleting(null);
          }}
          title={`Delete “${deleting?.name ?? ''}”?`}
          description="It goes from your templates. Emails you already sent with it are not affected."
          confirmLabel="Delete"
          variant="destructive"
          isPending={remove.isPending}
          onConfirm={() => {
            if (deleting) remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
          }}
          keepOpenOnConfirm
        />
      </span>
    </>
  );
}
