import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Archive,
  MailOpen,
  MoreHorizontal,
  Printer,
  ReplyAll,
  Trash2,
} from 'lucide-react';

export function EmailActionToolbar() {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2" aria-label="Email actions">
      <Button type="button" variant="outline" size="sm">
        <ReplyAll aria-hidden="true" className="size-3.5" />
        Reply all
      </Button>
      <Button type="button" variant="secondary" size="sm">
        <Archive aria-hidden="true" className="size-3.5" />
        Archive
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" mode="icon" size="icon" aria-label="More actions">
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <MailOpen aria-hidden="true" />
            Mark as unread
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Printer aria-hidden="true" />
            Print thread
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <Trash2 aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
