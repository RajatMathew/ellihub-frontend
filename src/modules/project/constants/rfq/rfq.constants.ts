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

