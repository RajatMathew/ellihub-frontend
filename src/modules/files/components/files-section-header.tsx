import { FILE_SECTION_LABELS, type FileSection } from '@/modules/files/lib/file-sections';
import { Lock, UserRound } from 'lucide-react';

interface FilesSectionHeaderProps {
  section: FileSection;
  count: number;
}

const SECTION_ICONS = { system: Lock, user: UserRound } satisfies Record<FileSection, unknown>;

export function FilesSectionHeader({ section, count }: FilesSectionHeaderProps) {
  const Icon = SECTION_ICONS[section];

  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-2sm font-semibold text-foreground">{FILE_SECTION_LABELS[section]}</span>
      <span className="text-2sm text-muted-foreground">{count}</span>
    </div>
  );
}
