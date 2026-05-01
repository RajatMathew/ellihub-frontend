import type { ReactNode } from 'react';

import { Card, CardContent } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { DetailSidebar } from '@/modules/directory/components/detail-sidebar';
import {
  DirectoryActivityPanel,
  type DirectoryActivityItem,
} from '@/modules/directory/components/shared';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { Briefcase, ExternalLink, Globe, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';

import { formatDirectoryDate } from './vendor-detail-utils';

interface VendorDetailSidebarProps {
  vendor: VendorDetail;
  open: boolean;
  activityItems: DirectoryActivityItem[];
  isActivityLoading: boolean;
  isActivityError: boolean;
  onClose: () => void;
  onRetryActivity: () => void;
}

export function VendorDetailSidebar({
  vendor,
  open,
  activityItems,
  isActivityLoading,
  isActivityError,
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
        />
      }
    >
      <div className="space-y-6 pt-2">
        <VendorVerificationCard vendor={vendor} />
        <VendorPlaceholderCard
          title="Compliance Documents"
          icon={<ShieldCheck className="size-8 text-muted-foreground/40" />}
          description="Compliance document tracking will be available in a future update."
        />
        <VendorPlaceholderCard
          title="Account Manager"
          icon={<Briefcase className="size-8 text-muted-foreground/40" />}
          description="Account manager assignment will be available in a future update."
        />
        {vendor.website && <VendorWebsiteCard website={vendor.website} />}
        {(vendor.phone || vendor.email || vendor.address) && (
          <VendorContactInfoCard vendor={vendor} />
        )}
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
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Established Date
            </span>
            <span className="text-sm font-semibold text-foreground">
              {formatDirectoryDate(vendor.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Last Review Date
            </span>
            <span className="text-sm font-semibold text-foreground">
              {formatDirectoryDate(vendor.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VendorPlaceholderCard({
  title,
  icon,
  description,
}: {
  title: string;
  icon: ReactNode;
  description: string;
}) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            {icon}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
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
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="break-words text-sm text-foreground">{vendor.address}</span>
            </div>
          )}
          {vendor.phone && (
            <>
              {vendor.address && <Separator />}
              <div className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <a href={`tel:${vendor.phone}`} className="break-words text-sm hover:text-primary">
                  {vendor.phone}
                </a>
              </div>
            </>
          )}
          {vendor.email && (
            <>
              {(vendor.address || vendor.phone) && <Separator />}
              <div className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
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
