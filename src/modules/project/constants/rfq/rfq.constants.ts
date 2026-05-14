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

export const RFQ_TRACK_OPTIONS = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'FABRICATION', label: 'Fabrication' },
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'EQUIPMENT', label: 'Equipment' },
] as const;

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

export type RFQVendorPdfProfile = {
  company: {
    name: string;
    addressLines: string[];
    phone: string;
    logoPath: string;
  };
  shipToName: string;
};

export const RFQ_VENDOR_PDF_PROFILE: RFQVendorPdfProfile = {
  company: {
    name: 'ELLI N.Y. DESIGN CORP.',
    addressLines: ['50-01 METROPOLITAN AVE', 'RIDGEWOOD, NY 11385'],
    phone: '718-418-9002',
    logoPath: 'assets/logo.png',
  },
  shipToName: 'Elli NY Design Corp',
};
