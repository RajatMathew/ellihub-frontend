import { useCallback } from 'react';

import type { FileItem } from '@/modules/files/schemas/file.schema';

function escapeCsvValue(value: string | number | null | undefined): string | number {
  if (typeof value === 'number') return value;

  return `"${(value ?? '').replace(/"/g, '""')}"`;
}

export function useFilesCsvExport(items: FileItem[]) {
  return useCallback(() => {
    const header = ['Name', 'Size', 'Created By', 'Updated At'];
    const rows = items.map((item) => [
      escapeCsvValue(item.displayName || item.name),
      item.size ?? '',
      escapeCsvValue(item.createdByUser?.name || item.createdBy),
      item.updatedAt ?? '',
    ]);
    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'files-export.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [items]);
}
