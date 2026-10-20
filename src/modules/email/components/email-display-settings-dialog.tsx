import type { ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Switch } from '@/app/components/ui/switch';
import { cn } from '@/app/lib/utils';
import {
  setShowEmailAvatars,
  useShowEmailAvatars,
} from '@/modules/email/hooks/use-email-avatar-visibility';
import {
  setCollapseLongEmails,
  useCollapseLongEmails,
} from '@/modules/email/hooks/use-email-body-collapse';
import {
  setStickyMessageHeader,
  useStickyMessageHeader,
} from '@/modules/email/hooks/use-email-sticky-header';
import {
  setShowEmailThreadTimeline,
  useShowEmailThreadTimeline,
} from '@/modules/email/hooks/use-email-thread-timeline-visibility';

/**
 * Workspace-wide mail display preferences (elli-ui#804) — a home for anything
 * display-related (signatures, etc.) to land in without a new modal each time.
 *
 * Laid out as a settings sheet (elli-ui#1423): a wide white card, settings
 * grouped under section headings, one row per setting with its explanation on
 * the left and its control on the right, rows separated by hairlines.
 */
export function EmailDisplaySettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const showAvatars = useShowEmailAvatars();
  const showTimeline = useShowEmailThreadTimeline();
  const collapseLongEmails = useCollapseLongEmails();
  const stickyHeader = useStickyMessageHeader();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 bg-card p-0">
        <DialogHeader className="mb-0 border-b border-border px-6 text-start pb-5 pt-6 sm:px-8 sm:pt-7">
          <DialogTitle className="text-xl">Email display settings</DialogTitle>
          <DialogDescription>
            Preferences for how mail is shown, saved to this browser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-8 px-6 py-6 sm:px-8 sm:pb-8">
          <SettingsSection title="Mail list">
            <SettingRow
              as="label"
              title="Show sender avatars"
              description="Hide the photo/initials circle in the mail list for a denser view."
            >
              <Switch checked={showAvatars} onCheckedChange={(next) => setShowEmailAvatars(next)} />
            </SettingRow>
          </SettingsSection>

          <SettingsSection title="Reading pane">
            <SettingRow
              as="label"
              title="Collapse long emails"
              description="Fold a long message behind a “Show more” button. Turn off to always open emails in full."
            >
              <Switch
                checked={collapseLongEmails}
                onCheckedChange={(next) => setCollapseLongEmails(next)}
              />
            </SettingRow>
            <SettingRow
              as="label"
              title="Keep the email header on screen"
              description="Pin the sender, date and reply buttons to the top while you scroll a long email."
            >
              <Switch
                checked={stickyHeader}
                onCheckedChange={(next) => setStickyMessageHeader(next)}
              />
            </SettingRow>
            <SettingRow
              title="Reading pane view"
              description="Show what each email made someone do, right above it."
            >
              <div
                role="tablist"
                aria-label="Reading pane view"
                className="flex w-fit shrink-0 gap-0.5 rounded-md border border-border p-0.5"
              >
                <SegmentedOption
                  label="Email only"
                  selected={!showTimeline}
                  onClick={() => setShowEmailThreadTimeline(false)}
                />
                <SegmentedOption
                  label="Email + Timeline"
                  selected={showTimeline}
                  onClick={() => setShowEmailThreadTimeline(true)}
                />
              </div>
            </SettingRow>
          </SettingsSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col">
      <h3 className="pb-1 text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex flex-col divide-y divide-border">{children}</div>
    </section>
  );
}

/**
 * One setting: what it is and why on the left, its control on the right. A
 * switch row is a `<label>` so the whole row toggles it; a row holding several
 * buttons is a plain `<div>`.
 */
function SettingRow({
  as: Row = 'div',
  title,
  description,
  children,
}: {
  as?: 'label' | 'div';
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Row
      data-slot="setting-row"
      className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4"
    >
      <span className="min-w-0 flex-1 basis-64">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
      </span>
      {children}
    </Row>
  );
}

function SegmentedOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={cn(
        'cursor-pointer whitespace-nowrap rounded-sm px-3 py-1.5 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100',
        selected
          ? 'bg-muted font-medium text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
