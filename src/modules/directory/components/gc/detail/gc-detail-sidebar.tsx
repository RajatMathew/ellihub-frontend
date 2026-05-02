import { DetailSidebar } from '@/app/components/detail-sidebar';
import { Card, CardContent } from '@/app/components/ui/card';
import { ContactCard } from '@/modules/directory/components/contact-card';
import {
  DirectoryActivityPanel,
  type DirectoryActivityItem,
  type DirectoryContactSnapshot,
} from '@/modules/directory/components/shared';
import { ShieldCheck, UserMinus } from 'lucide-react';

interface GCDetailSidebarProps {
  open: boolean;
  contacts: DirectoryContactSnapshot[];
  activityItems: DirectoryActivityItem[];
  isActivityLoading: boolean;
  isActivityError: boolean;
  onClose: () => void;
  onRetryActivity: () => void;
}

export function GCDetailSidebar({
  open,
  contacts,
  activityItems,
  isActivityLoading,
  isActivityError,
  onClose,
  onRetryActivity,
}: GCDetailSidebarProps) {
  return (
    <DetailSidebar
      open={open}
      onClose={onClose}
      activityChildren={
        <DirectoryActivityPanel
          items={activityItems}
          isLoading={isActivityLoading}
          isError={isActivityError}
          onRetry={onRetryActivity}
        />
      }
    >
      <div className="space-y-6 pt-2">
        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Team Directory
          </div>
          <Card>
            <CardContent className="space-y-4 p-4">
              {contacts.length > 0 ? (
                contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    fullName={contact.fullName}
                    email={contact.email?.[0]?.email ?? null}
                    phone={contact.phoneNumber?.[0]?.number ?? null}
                    isPrimary={contact.isPrimary}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <UserMinus className="size-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No contacts linked</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Compliance & Safety Docs
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <ShieldCheck className="size-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Compliance document tracking will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DetailSidebar>
  );
}
