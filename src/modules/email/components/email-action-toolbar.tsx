import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input } from '@/app/components/ui/input';
import type { ConnectedEmailFolder, ConnectedEmailTag } from '@/modules/email/api';
import { EmailPermanentDeleteDialog } from '@/modules/email/components/email-permanent-delete-dialog';
import {
  Archive,
  FolderInput,
  MailOpen,
  MoreHorizontal,
  Plus,
  Printer,
  ReplyAll,
  Tag,
  Trash2,
} from 'lucide-react';

type EmailActionToolbarProps = {
  folders?: ConnectedEmailFolder[];
  tags?: ConnectedEmailTag[];
  keywords?: string[];
  currentFolderId?: string | null;
  isUpdatingTags?: boolean;
  isCreatingTag?: boolean;
  archiveActionLabel?: string;
  onMoveToFolder?: (folderId: string) => void;
  onToggleTag?: (tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreateTag?: (name: string) => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onPermanentDelete?: () => Promise<void> | void;
  isPermanentlyDeleting?: boolean;
  onReply?: () => void;
};

export function EmailActionToolbar({
  folders = [],
  tags = [],
  keywords = [],
  currentFolderId,
  isUpdatingTags = false,
  isCreatingTag = false,
  archiveActionLabel = 'Archive',
  onMoveToFolder,
  onToggleTag,
  onCreateTag,
  onArchive,
  onDelete,
  onPermanentDelete,
  isPermanentlyDeleting = false,
  onReply,
}: EmailActionToolbarProps) {
  const [newTagName, setNewTagName] = useState('');
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const movableFolders = folders.filter((folder) => folder.id !== currentFolderId);
  const keywordSet = new Set(keywords.map((keyword) => keyword.toLowerCase()));

  const submitNewTag = () => {
    const name = newTagName.trim();
    if (!name || !onCreateTag) return;
    onCreateTag(name);
    setNewTagName('');
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2" aria-label="Email actions">
      <Button type="button" variant="outline" size="sm" disabled={!onReply} onClick={onReply}>
        <ReplyAll aria-hidden="true" className="size-3.5" />
        Reply
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled={!onArchive} onClick={onArchive}>
        <Archive aria-hidden="true" className="size-3.5" />
        {archiveActionLabel}
      </Button>
      {onPermanentDelete && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPermanentlyDeleting}
          aria-busy={isPermanentlyDeleting}
          onClick={() => setPermanentDeleteDialogOpen(true)}
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          Delete permanently
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" mode="icon" size="icon" aria-label="More actions">
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onMoveToFolder && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput aria-hidden="true" />
                Move to folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 w-64 overflow-y-auto">
                <DropdownMenuLabel>Folders</DropdownMenuLabel>
                {movableFolders.length === 0 ? (
                  <DropdownMenuItem disabled>No folders available</DropdownMenuItem>
                ) : (
                  movableFolders.map((folder) => (
                    <DropdownMenuItem key={folder.id} onClick={() => onMoveToFolder(folder.id)}>
                      {folder.name}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {onToggleTag && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Tag aria-hidden="true" />
                Tags
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-72">
                <DropdownMenuLabel>Tags</DropdownMenuLabel>
                {tags.length === 0 ? (
                  <DropdownMenuItem disabled>No tags yet</DropdownMenuItem>
                ) : (
                  tags.map((tag) => {
                    const checked =
                      keywordSet.has(tag.name.toLowerCase()) ||
                      keywordSet.has(tag.providerId.toLowerCase());

                    return (
                      <DropdownMenuCheckboxItem
                        key={tag.id}
                        checked={checked}
                        disabled={isUpdatingTags}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={(enabled) => onToggleTag(tag, Boolean(enabled))}
                      >
                        <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                      </DropdownMenuCheckboxItem>
                    );
                  })
                )}
                {onCreateTag && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="flex items-center gap-2 px-1 py-1">
                      <Input
                        value={newTagName}
                        placeholder="New tag"
                        className="h-8 text-sm"
                        disabled={isCreatingTag}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            submitNewTag();
                          }
                        }}
                        onChange={(event) => setNewTagName(event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        mode="icon"
                        size="sm"
                        className="size-8 shrink-0"
                        disabled={!newTagName.trim() || isCreatingTag}
                        aria-label="Create tag"
                        onClick={submitNewTag}
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem>
            <MailOpen aria-hidden="true" />
            Mark as unread
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Printer aria-hidden="true" />
            Print thread
          </DropdownMenuItem>
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <EmailPermanentDeleteDialog
        open={permanentDeleteDialogOpen}
        isPending={isPermanentlyDeleting}
        onOpenChange={setPermanentDeleteDialogOpen}
        onConfirm={() => onPermanentDelete?.()}
      />
    </div>
  );
}
