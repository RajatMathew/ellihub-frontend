import { useMemo } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { formatCurrency } from '@/app/lib/helpers';
import { ContactCard } from '@/modules/directory/components/contact-card';
import type { DirectoryContactSnapshot } from '@/modules/directory/components/shared';
import { getVendorCommitmentSummaries } from '@/modules/directory/components/vendors/vendor-commitment-utils';
import { PAYMENT_TERMS_LABELS } from '@/modules/directory/constants/shared.constants';
import {
  VENDOR_STATUS_COLORS,
  VENDOR_STATUS_LABELS,
} from '@/modules/directory/constants/vendors/vendor-detail.constants';
import type { VendorDetail } from '@/modules/directory/schemas/vendor.schema';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';
import { UserMinus } from 'lucide-react';

import { getVendorTypeLabel } from './vendor-detail-utils';

interface VendorOverviewTabProps {
  vendor: VendorDetail;
  contacts: DirectoryContactSnapshot[];
}

export function VendorOverviewTab({ vendor, contacts }: VendorOverviewTabProps) {
  const purchaseOrdersQuery = usePOsQuery({
    vendorId: vendor.id,
    page: 1,
    size: 1000,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const commitment = useMemo(
    () => getVendorCommitmentSummaries(purchaseOrdersQuery.data?.data ?? []).get(vendor.id),
    [purchaseOrdersQuery.data?.data, vendor.id]
  );
  const totalCommitted = commitment?.totalCommitted ?? vendor.totalCommitted;
  const currentBalance = totalCommitted - vendor.totalPaid;

  return (
    <div className="space-y-5">
      <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <VendorFinancialCard
          vendor={vendor}
          totalCommitted={totalCommitted}
          currentBalance={currentBalance}
        />
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
            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
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

function VendorFinancialCard({
  vendor,
  totalCommitted,
  currentBalance,
}: {
  vendor: VendorDetail;
  totalCommitted: number;
  currentBalance: number;
}) {
  const rows = [
    { label: 'Total Committed', value: formatCurrency(totalCommitted) },
    { label: 'Paid to Date', value: formatCurrency(vendor.totalPaid) },
    { label: 'Outstanding', value: formatCurrency(vendor.outstandingBalance) },
    { label: 'Current Balance', value: formatCurrency(currentBalance) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {rows.map((row, index) => (
          <div key={row.label}>
            <div className="flex min-w-0 items-start justify-between gap-4">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-semibold text-foreground">{row.value}</span>
            </div>
            {index < rows.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
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
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm text-muted-foreground">Vendor Type</span>
          <span className="break-words text-right text-sm font-medium text-foreground">
            {getVendorTypeLabel(vendor)}
          </span>
        </div>
        <Separator />
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm text-muted-foreground">Payment Terms</span>
          <Badge variant="secondary" size="sm" className="min-w-0 break-words text-right">
            {vendor.paymentTerms ? PAYMENT_TERMS_LABELS[vendor.paymentTerms] : '-'}
          </Badge>
        </div>
        <Separator />
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm text-muted-foreground">Default Status</span>
          <div className="flex min-w-0 items-center gap-1.5 text-right">
            <span
              className={`size-2 rounded-full ${
                VENDOR_STATUS_COLORS[vendor.status] ?? 'bg-muted-foreground'
              }`}
            />
            <span className="break-words text-sm font-medium">
              {VENDOR_STATUS_LABELS[vendor.status] ?? vendor.status}
            </span>
          </div>
        </div>
        <Separator />
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="text-sm text-muted-foreground">Tax ID / EIN</span>
          <span className="break-words text-right text-sm font-medium text-foreground">
            {vendor.taxId || '-'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
