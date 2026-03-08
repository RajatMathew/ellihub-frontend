import { useMemo } from 'react';

import { Clock, FileIcon, FolderIcon, FolderOpen } from 'lucide-react';

import { StatsCard } from '@app/components/ui/stats-card';

import type { FileItem } from '@modules/files/schemas/file.schema';

export function FilesListStats({ data }: { data: FileItem[] }) {
  const stats = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return {
      total: data.length,
      files: data.filter((f) => f.type === 'FILE').length,
      folders: data.filter((f) => f.type === 'FOLDER').length,
      recent: data.filter((f) => now - new Date(f.createdAt).getTime() < sevenDays).length,
    };
  }, [data]);

  const items = [
    {
      label: 'Total Items',
      value: stats.total,
      description: 'Files and folders',
      icon: <FolderOpen className="size-6 text-primary" />,
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Files',
      value: stats.files,
      description: 'Uploaded files',
      icon: <FileIcon className="size-6 text-info" />,
      bgClass: 'bg-info/10',
    },
    {
      label: 'Folders',
      value: stats.folders,
      description: 'Created folders',
      icon: <FolderIcon className="size-6 text-warning" />,
      bgClass: 'bg-warning/10',
    },
    {
      label: 'Recent',
      value: stats.recent,
      description: 'Last 7 days',
      icon: <Clock className="size-6 text-success" />,
      bgClass: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5 lg:mb-7.5">
      {items.map((item) => (
        <StatsCard
          key={item.label}
          icon={item.icon}
          bgClass={item.bgClass}
          label={item.label}
          value={item.value}
          description={item.description}
        />
      ))}
    </div>
  );
}
