import type { ActivityPanelCommentControls } from '@/app/components/activity-panel';
import { DetailSidebar } from '@/app/components/detail-sidebar';
import { ImportSourcePanel } from '@/app/components/import-source';
import { Card, CardContent } from '@/app/components/ui/card';
import type { ImportSource } from '@/app/lib/import-source';
import { ContactCard } from '@/modules/directory/components/contact-card';
import {
  DirectoryActivityPanel,
  type DirectoryActivityItem,
  type DirectoryContactSnapshot,
} from '@/modules/directory/components/shared';
import type { GCDocument } from '@/modules/directory/schemas/gc.schema';
import { UserMinus } from 'lucide-react';

import { GCDocumentsCard } from './gc-documents-card';

interface GCDetailSidebarProps {
  open: boolean;
  /** Where the GC came from, when the migration import made it. */
  importSource?: ImportSource | null;
  contacts: DirectoryContactSnapshot[];
  documents: GCDocument[];
  activityItems: DirectoryActivityItem[];
  isActivityLoading: boolean;
  isActivityError: boolean;
  activityCommentControls?: ActivityPanelCommentControls;
  onClose: () => void;
  onRetryActivity: () => void;
}

export function GCDetailSidebar({
  open,
  importSource,
  contacts,
  documents,
  activityItems,
  isActivityLoading,
  isActivityError,
  activityCommentControls,
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
          {...activityCommentControls}
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
                    importSource={contact.importSource}
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
          <GCDocumentsCard documents={documents} />
        </div>
        {importSource ? <ImportSourcePanel source={importSource} /> : null}
      </div>
    </DetailSidebar>
  );
}
