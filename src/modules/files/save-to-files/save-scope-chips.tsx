import { PickerChip, PickerChipRow } from '@/modules/files/save-to-files/picker-chip';
import type { SaveToFilesScope } from '@/modules/files/save-to-files/save-scopes';
import { FolderKanban } from 'lucide-react';

interface SaveScopeChipsProps {
  scopes: readonly SaveToFilesScope[];
  selectedId: string | undefined;
  /** The picked project whose folder is still being looked up. */
  loadingId?: string;
  disabled?: boolean;
  onSelect: (scopeId: string) => void;
}

/**
 * One chip per project the save can go under (elli-ui#1067), in a row that
 * scrolls sideways rather than wrapping — a thread can be linked to many
 * projects, and the folder list below is what should get the height.
 */
export function SaveScopeChips({
  scopes,
  selectedId,
  loadingId,
  disabled = false,
  onSelect,
}: SaveScopeChipsProps) {
  if (scopes.length === 0) return null;

  return (
    <PickerChipRow caption="Projects">
      {scopes.map((scope) => (
        <PickerChip
          key={scope.id}
          label={scope.label}
          icon={FolderKanban}
          selected={scope.id === selectedId}
          loading={loadingId === scope.id}
          disabled={disabled}
          onClick={() => onSelect(scope.id)}
        />
      ))}
    </PickerChipRow>
  );
}
