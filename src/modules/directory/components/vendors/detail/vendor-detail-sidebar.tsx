import type { ActivityPanelCommentControls } from '@/app/components/activity-panel';
import { DetailSidebar } from '@/app/components/detail-sidebar';
import { FileFormatBadge } from '@/app/components/file-format-badge';
import { ImportSourcePanel } from '@/app/components/import-source';
import { Card, CardContent } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { formatDate } from '@/app/lib/helpers';
import {
  DirectoryActivityPanel,
  type DirectoryActivityItem,
} from '@/modules/directory/components/shared';
import type { VendorDetail, VendorDocument } from '@/modules/directory/schemas/vendor.schema';
import { ExternalLink, Globe, Mail, MapPin, Smartphone } from 'lucide-react';

import { formatDirectoryDate } from './vendor-detail-utils';

interface VendorDetailSidebarProps {
  vendor: VendorDetail;
  open: boolean;
  activityItems: DirectoryActivityItem[];
  isActivityLoading: boolean;
  isActivityError: boolean;
  activityCommentControls?: ActivityPanelCommentControls;
  onClose: () => void;
  onRetryActivity: () => void;
}

export function VendorDetailSidebar({
  vendor,
  open,
  activityItems,
  isActivityLoading,
  isActivityError,
  activityCommentControls,
  onClose,
  onRetryActivity,
}: VendorDetailSidebarProps) {
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
        <VendorVerificationCard vendor={vendor} />
        {vendor.documents.length > 0 && <VendorDocumentsCard documents={vendor.documents} />}
        {vendor.website && <VendorWebsiteCard website={vendor.website} />}
        {(vendor.phone || vendor.email || vendor.address) && (
          <VendorContactInfoCard vendor={vendor} />
        )}
        {vendor.importSource ? <ImportSourcePanel source={vendor.importSource} /> : null}
      </div>
    </DetailSidebar>
  );
}

function VendorVerificationCard({ vendor }: { vendor: VendorDetail }) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Verification & Compliance
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Established Date
            </span>
            <span className="break-words text-sm font-semibold text-foreground sm:text-right">
              {vendor.createdAt ? formatDate(vendor.createdAt) : '-'}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Last Review Date
            </span>
            <span className="break-words text-sm font-semibold text-foreground sm:text-right">
              {vendor.updatedAt ? formatDate(vendor.updatedAt) : '-'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VendorDocumentsCard({ documents }: { documents: VendorDocument[] }) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Documents
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          {documents.map((document, index) => (
            <div key={document.id}>
              <div className="flex min-w-0 items-start gap-3">
                <FileFormatBadge
                  fileName={document.file?.displayName || document.file?.name}
                  mimeType={document.file?.mimeType}
                  className="size-6"
                />
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium text-foreground">
                    {document.file?.displayName || document.file?.name || document.fileId}
                  </div>
                  {document.expiresOn && (
                    <div className="text-xs text-muted-foreground">
                      Expires {formatDirectoryDate(document.expiresOn)}
                    </div>
                  )}
                </div>
              </div>
              {index < documents.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function VendorWebsiteCard({ website }: { website: string }) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Official Website
      </div>
      <Card>
        <CardContent className="p-4">
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2 break-all text-sm text-primary hover:text-primary/80"
          >
            <Globe className="size-4 shrink-0" />
            {website.replace(/^https?:\/\//, '')}
            <ExternalLink className="size-3 shrink-0" />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

function VendorContactInfoCard({ vendor }: { vendor: VendorDetail }) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Contact Info
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          {vendor.address && (
            <div className="flex min-w-0 items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 break-words text-sm text-foreground">
                <span className="sr-only">Address: </span>
                {vendor.address}
              </span>
            </div>
          )}
          {vendor.phone && (
            <>
              {vendor.address && <Separator />}
              <div className="flex min-w-0 items-start gap-3">
                <Smartphone
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <a
                  href={`tel:${vendor.phone}`}
                  className="min-w-0 break-words text-sm hover:text-primary"
                >
                  <span className="sr-only">Cell phone: </span>
                  {vendor.phone}
                </a>
              </div>
            </>
          )}
          {vendor.email && (
            <>
              {(vendor.address || vendor.phone) && <Separator />}
              <div className="flex min-w-0 items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <a href={`mailto:${vendor.email}`} className="break-all text-sm hover:text-primary">
                  {vendor.email}
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
