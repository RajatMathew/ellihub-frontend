import { DetailPageHeader } from '@/app/components/page-header';
import { StatusBadge } from '@/app/components/status-badge';
import { Badge } from '@/app/components/ui/badge';
import {
  GC_STATUS_LABELS,
  GC_TYPE_BADGE_VARIANTS,
} from '@/modules/directory/constants/gc/gc-detail.constants';
import type { GeneralContractorDetail } from '@/modules/directory/schemas/gc.schema';
import { Pencil, Trash2 } from 'lucide-react';

import { getGCTypeCode, getGCTypeName } from './gc-detail-utils';

interface GCDetailToolbarProps {
  gc: GeneralContractorDetail;
  sidebarOpen: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onOpenSidebar: () => void;
}

export function GCDetailToolbar({
  gc,
  sidebarOpen,
  canUpdate,
  canDelete,
  onDelete,
  onOpenSidebar,
}: GCDetailToolbarProps) {
  const typeCode = getGCTypeCode(gc);

  return (
    <DetailPageHeader
      backLabel="General Contractors"
      title={gc.name}
      status={
        <>
          <Badge
            variant={typeCode ? (GC_TYPE_BADGE_VARIANTS[typeCode] ?? 'primary') : 'primary'}
            appearance="outline"
            size="sm"
          >
            {getGCTypeName(gc)}
          </Badge>
          <StatusBadge label={GC_STATUS_LABELS[gc.status]} status={gc.status} />
        </>
      }
      actions={[
        { label: 'Edit Profile', icon: Pencil, to: 'edit', enabled: canUpdate },
        {
          label: 'Archive GC',
          icon: Trash2,
          placement: 'overflow',
          destructive: true,
          onClick: onDelete,
          enabled: canDelete,
        },
      ]}
      panel={{ open: sidebarOpen, onOpen: onOpenSidebar }}
    />
  );
}
