import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency } from '@/app/lib/helpers';
import { Separator } from '@/app/components/ui/separator';
import {
  GC_STATUS_COLORS,
  GC_STATUS_LABELS,
} from '@/modules/directory/constants/gc/gc-detail.constants';
import { PAYMENT_TERMS_LABELS } from '@/modules/directory/constants/shared.constants';
import type { GeneralContractorDetail } from '@/modules/directory/schemas/gc.schema';
import {
  Briefcase,
  Building2,
  DollarSign,
  FolderOpen,
  Globe,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';

import { getGCTypeName } from './gc-detail-utils';
import { getGCProjectMetrics } from './gc-project-metrics';

interface GCOverviewTabProps {
  gc: GeneralContractorDetail;
}

export function GCOverviewTab({ gc }: GCOverviewTabProps) {
  const { activeProjects, totalCommitted, totalProjects } = getGCProjectMetrics(gc);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            General Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <GCInfoRow icon={<Building2 className="size-4" />} label="Entity Type">
            {getGCTypeName(gc)}
          </GCInfoRow>
          <GCInfoRow icon={<Briefcase className="size-4" />} label="Status">
            <span className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  GC_STATUS_COLORS[gc.status] ?? 'bg-muted-foreground'
                }`}
              />
              {GC_STATUS_LABELS[gc.status] ?? gc.status}
            </span>
          </GCInfoRow>
          <Separator />
          <GCInfoRow icon={<FolderOpen className="size-4" />} label="Total Projects">
            {totalProjects}
          </GCInfoRow>
          <GCInfoRow icon={<FolderOpen className="size-4" />} label="Active Projects">
            {activeProjects}
          </GCInfoRow>
          <GCInfoRow icon={<DollarSign className="size-4" />} label="Total Committed">
            {formatCurrency(totalCommitted)}
          </GCInfoRow>
          <GCInfoRow icon={<DollarSign className="size-4" />} label="Payment Terms">
            {gc.paymentTerms ? (PAYMENT_TERMS_LABELS[gc.paymentTerms] ?? gc.paymentTerms) : '-'}
          </GCInfoRow>
          <GCInfoRow icon={<DollarSign className="size-4" />} label="Retainage %">
            {gc.retainagePercent}%
          </GCInfoRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Company Contact Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <GCInfoRow icon={<MapPin className="size-4" />} label="Main Office Address">
            {gc.address || 'No address provided'}
          </GCInfoRow>
          <GCInfoRow icon={<Phone className="size-4" />} label="Primary Phone">
            {gc.phone ? (
              <a href={`tel:${gc.phone}`} className="hover:text-primary">
                {gc.phone}
              </a>
            ) : (
              '-'
            )}
          </GCInfoRow>
          <GCInfoRow icon={<Mail className="size-4" />} label="Company Email">
            {gc.email ? (
              <a href={`mailto:${gc.email}`} className="break-all hover:text-primary">
                {gc.email}
              </a>
            ) : (
              '-'
            )}
          </GCInfoRow>
          <Separator />
          <GCInfoRow icon={<Globe className="size-4" />} label="Official Website">
            {gc.website ? (
              <a
                href={gc.website}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-primary hover:underline"
              >
                {gc.website.replace(/^https?:\/\//, '')}
              </a>
            ) : (
              '-'
            )}
          </GCInfoRow>
        </CardContent>
      </Card>
    </div>
  );
}

function GCInfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-accent text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <div className="break-words text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}
