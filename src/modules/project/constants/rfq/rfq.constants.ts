export function getRfqStatusVariant(statusName: string | null | undefined) {
  switch (statusName) {
    case 'PUBLISHED':
      return 'primary' as const;
    case 'EVALUATION':
      return 'warning' as const;
    case 'AWARDED':
      return 'success' as const;
    case 'CANCELLED':
      return 'destructive' as const;
    case 'DRAFT':
    case 'VOID':
    default:
      return 'secondary' as const;
  }
}

export const RFQ_TRACK_LABELS: Record<string, string> = {
  MATERIAL: 'Material',
  FABRICATION: 'Fabrication',
  INSTALLATION: 'Installation',
  LABOR: 'Labor',
  EQUIPMENT: 'Equipment',
};

export const RFQ_FORM_SECTIONS = [
  { id: 'rfq-details', label: 'RFQ Details' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'documents', label: 'Documents' },
] as const;

export const RFQ_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted-foreground',
  PUBLISHED: 'bg-primary',
  EVALUATION: 'bg-warning',
  AWARDED: 'bg-success',
  CANCELLED: 'bg-destructive',
  VOID: 'bg-muted-foreground',
};
