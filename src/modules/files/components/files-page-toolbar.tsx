import { ListPageHeader } from '@/app/components/page-header';
import { Download, FolderPlus, Loader2, Upload } from 'lucide-react';

/**
 * The Files explorer header.
 *
 * Search is deliberately absent: it lives in the card header alongside the
 * scope segment, because searching "everywhere" and searching "this folder" are
 * different questions and the control has to say which one it is asking.
 */
interface FilesPageToolbarProps {
  /** Overridden when the explorer is embedded under another resource. */
  title?: string;
  canCreateFolder: boolean;
  canUpload: boolean;
  canExport: boolean;
  isExporting?: boolean;
  showMutationActions?: boolean;
  onExport: () => void;
  onCreateFolder: () => void;
  onUploadFile: () => void;
}

export function FilesPageToolbar({
  title = 'Files',
  canCreateFolder,
  canUpload,
  canExport,
  isExporting = false,
  showMutationActions = true,
  onExport,
  onCreateFolder,
  onUploadFile,
}: FilesPageToolbarProps) {
  return (
    <ListPageHeader
      title={title}
      actions={[
        {
          label: isExporting ? 'View Export' : 'Export ZIP',
          icon: isExporting ? Loader2 : Download,
          pending: isExporting,
          disabled: !canExport,
          onClick: onExport,
        },
        {
          label: 'New Folder',
          icon: FolderPlus,
          enabled: [showMutationActions, canCreateFolder],
          onClick: onCreateFolder,
        },
        {
          label: 'Upload',
          icon: Upload,
          placement: 'primary',
          enabled: [showMutationActions, canUpload],
          onClick: onUploadFile,
        },
      ]}
    />
  );
}
