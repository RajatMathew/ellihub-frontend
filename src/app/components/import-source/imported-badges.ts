import type { BadgeDef } from '@/app/components/page-header/page-header.types';
import type { ImportSource } from '@/app/lib/import-source';
import { FileSpreadsheet } from 'lucide-react';

/** The header badge a record loaded from a migration workbook gets; none otherwise. */
export const importedBadges = (source?: ImportSource | null): BadgeDef[] =>
  source ? [{ label: 'Imported', variant: 'info', icon: FileSpreadsheet }] : [];
