import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Switch } from '@/app/components/ui/switch';
import {
  setShowEmailAvatars,
  useShowEmailAvatars,
} from '@/modules/email/hooks/use-email-avatar-visibility';

/**
 * Workspace-wide mail display preferences (elli-ui#804). Deliberately just
 * the one setting for now — a home for anything else display-related
 * (signatures, etc.) to land in later without a new modal each time.
 */
export function EmailDisplaySettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const showAvatars = useShowEmailAvatars();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Email display settings</DialogTitle>
          <DialogDescription>Preferences for how mail is shown, saved to this browser.</DialogDescription>
        </DialogHeader>

        <label className="flex items-start justify-between gap-4 py-1">
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">Show sender avatars</span>
            <span className="block text-xs text-muted-foreground">
              Hide the photo/initials circle in the mail list for a denser view.
            </span>
          </span>
          <Switch
            checked={showAvatars}
            onCheckedChange={(next) => setShowEmailAvatars(next)}
          />
        </label>
      </DialogContent>
    </Dialog>
  );
}
