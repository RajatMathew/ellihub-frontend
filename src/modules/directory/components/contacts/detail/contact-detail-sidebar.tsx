import { DetailSidebar } from '@/app/components/detail-sidebar';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import type {
  ContactActivityItem,
  ContactEntityLink,
} from '@/modules/directory/components/contacts/detail/contact-detail.types';
import { DirectoryActivityPanel } from '@/modules/directory/components/shared';
import { Building2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContactDetailSidebarProps {
  open: boolean;
  links: ContactEntityLink[];
  activityItems: ContactActivityItem[];
  isActivityLoading: boolean;
  isActivityError: boolean;
  onClose: () => void;
  onRetryActivity: () => void;
}

export function ContactDetailSidebar({
  open,
  links,
  activityItems,
  isActivityLoading,
  isActivityError,
  onClose,
  onRetryActivity,
}: ContactDetailSidebarProps) {
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
      <div className="space-y-4 pt-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Entity Association
        </div>

        {links.length > 0 ? (
          <div className="space-y-3">
            {links.map((link) => (
              <Card key={`${link.entityType}-${link.id}`}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-words text-sm font-bold uppercase text-foreground">
                        {link.name}
                      </div>
                      {link.isPrimary && (
                        <Badge variant="secondary" appearance="light" size="sm" className="mt-1">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" mode="icon" className="size-6" asChild>
                      <Link to={getEntityPath(link)} aria-label={`Open ${link.name}`}>
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase text-foreground">
                      {link.entityType}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-4 text-sm text-muted-foreground">No entity linked</div>
        )}
      </div>
    </DetailSidebar>
  );
}

function getEntityPath(link: ContactEntityLink) {
  if (link.entityType === 'VENDOR' && link.vendorId) {
    return `/app/directory/vendors/${link.vendorId}`;
  }
  if (link.entityType === 'GC' && link.generalContractorId) {
    return `/app/directory/general-contractors/${link.generalContractorId}`;
  }
  return '/app/directory/contacts';
}
