import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import type { ContactTagsEditor } from '@/modules/directory/hooks/contacts/use-contact-tags';
import { Plus, X } from 'lucide-react';

interface ContactTagsEditorProps {
  tags: string[];
  editor: ContactTagsEditor;
}

export function ContactTagsEditor({ tags, editor }: ContactTagsEditorProps) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Classification & Tags
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            appearance="outline"
            size="sm"
            className="gap-1 pr-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => editor.handleRemoveTag(tag)}
              className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
              aria-label={`Remove ${tag}`}
              disabled={editor.isUpdatingTags}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Button
          variant="outline"
          size="sm"
          mode="icon"
          className="size-7"
          onClick={editor.toggleAddTag}
          disabled={editor.isUpdatingTags}
          aria-label={editor.showAddTag ? 'Cancel tag entry' : 'Add tag'}
        >
          <Plus className="size-3" />
        </Button>
      </div>

      {editor.showAddTag && (
        <div className="mt-2">
          <Input
            type="text"
            value={editor.newTagValue}
            onChange={(event) => editor.setNewTagValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                editor.handleAddTag();
              } else if (event.key === 'Escape') {
                editor.closeAddTag();
              }
            }}
            onBlur={() => {
              if (editor.newTagValue.trim()) {
                editor.handleAddTag();
                return;
              }
              editor.closeAddTag();
            }}
            placeholder="Type a tag and press Enter..."
            className="h-8 text-xs"
            autoFocus
          />
        </div>
      )}
    </div>
  );
}
