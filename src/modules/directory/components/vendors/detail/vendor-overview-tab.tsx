import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { ContactCard } from '@/modules/directory/components/contact-card';
import type { DirectoryContactSnapshot } from '@/modules/directory/components/shared';
import { PAYMENT_TERMS_LABELS } from '@/modules/directory/constants/shared.constants';
import {
  VENDOR_STATUS_COLORS,
  VENDOR_STATUS_LABELS,
} from '@/modules/directory/constants/vendors/vendor-detail.constants';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { UserMinus } from 'lucide-react';

interface VendorOverviewTabProps {
  vendor: VendorDetail;
  contacts: DirectoryContactSnapshot[];
}

export function VendorOverviewTab({ vendor, contacts }: VendorOverviewTabProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <VendorFinancialCard />
        <VendorInfoCard vendor={vendor} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Team Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="rounded-lg border border-border p-4">
                  <ContactCard
                    fullName={contact.fullName}
                    email={contact.email?.[0]?.email ?? null}
                    phone={contact.phoneNumber?.[0]?.number ?? null}
                    isPrimary={contact.isPrimary}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <UserMinus className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VendorFinancialCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {['Total Committed', 'Total Paid', 'Retainage Held', 'Current Balance'].map((label) => (
          <div key={label}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold text-muted-foreground">-</span>
            </div>
            {label !== 'Current Balance' && <Separator className="mt-4" />}
          </div>
        ))}
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Financial data will be available in a future update.
        </p>
      </CardContent>
    </Card>
  );
}

function VendorInfoCard({ vendor }: { vendor: VendorDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Payment Terms</span>
          <Badge variant="secondary" size="sm">
            {vendor.paymentTerms ? PAYMENT_TERMS_LABELS[vendor.paymentTerms] : '-'}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Retainage %</span>
          <Badge variant="secondary" size="sm">
            -
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">Default Status</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${
                VENDOR_STATUS_COLORS[vendor.status] ?? 'bg-muted-foreground'
              }`}
            />
            <span className="text-sm font-medium">
              {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
