import { FileText, Paperclip, Plus } from 'lucide-react';

interface Attachment {
  id: string;
  name: string;
  size: string;
}

export function AttachmentsSection({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Paperclip className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Attachments{' '}
            <span className="text-muted-foreground">({attachments.length})</span>
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-success transition-colors hover:text-success/80"
        >
          <Plus className="size-3.5" />
          Add File
        </button>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {attachments.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30 cursor-pointer"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-destructive/10">
              <FileText className="size-4 text-destructive" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground truncate">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground">{file.size}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
