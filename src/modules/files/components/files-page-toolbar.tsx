import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Download, FolderPlus, Loader2, Upload } from 'lucide-react';

/**
 * The page-level actions for Files.
 *
 * Search used to live here, styled as a page control and with its scope on a
 * panel that appeared on focus. It now sits in the card header with every other
 * list's search, via `f.search`'s `scope` segment — so this is actions only.
 */
interface FilesPageToolbarProps {
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
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions className="w-full min-w-0 items-stretch sm:w-auto sm:items-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={onExport}
            disabled={!canExport}
          >
            {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
            {isExporting ? 'View Export' : 'Export ZIP'}
          </Button>
          {showMutationActions && canCreateFolder && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onCreateFolder}
            >
              <FolderPlus />
              New Folder
            </Button>
          )}
          {showMutationActions && canUpload && (
            <Button size="sm" className="w-full sm:w-auto" onClick={onUploadFile}>
              <Upload />
              Upload
            </Button>
          )}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
