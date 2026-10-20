import { useDataGrid } from '@/app/components/ui/data-grid';
import type { SectionedFiles } from '@/modules/files/lib/file-sections';
import type { FileItem } from '@/modules/files/schemas/file.schema';

import { FilesGridLoading } from './files-grid-loading';
import { FilesGridView } from './files-grid-view';
import { FilesSectionHeader } from './files-section-header';

interface FilesGridContentProps {
  sectionedData: SectionedFiles;
  isLoading: boolean;
  showLocation?: boolean;
  locationRootId?: string;
  locationRootLabel?: string;
  onFolderClick: (folder: FileItem) => void;
  onFilePreview: (file: FileItem) => void;
  onFolderExport: (folder: FileItem) => void;
  canExport?: boolean;
  onPinPrimeContract?: (file: FileItem) => void;
  canPinPrimeContract?: (file: FileItem) => boolean;
  onSetPrimeContractPrimary?: (file: FileItem, isPrimary: boolean) => void;
  canSetPrimeContractPrimary?: (file: FileItem) => boolean;
}

export function FilesGridContent({
  sectionedData,
  isLoading,
  showLocation,
  locationRootId,
  locationRootLabel,
  onFolderClick,
  onFilePreview,
  onFolderExport,
  canExport = true,
  onPinPrimeContract,
  canPinPrimeContract,
  onSetPrimeContractPrimary,
  canSetPrimeContractPrimary,
}: FilesGridContentProps) {
  // The explorer's empty state, which knows whether a search found nothing.
  const { props } = useDataGrid();

  if (isLoading) return <FilesGridLoading />;

  if (sectionedData.data.length === 0) return <>{props.emptyMessage}</>;

  return (
    <div className="min-w-0">
      {sectionedData.systemItems.length > 0 && (
        <>
          <div className="min-w-0 border-y border-border bg-muted/50 px-3 py-2.5 sm:px-5">
            <FilesSectionHeader section="system" count={sectionedData.systemItems.length} />
          </div>
          <FilesGridView
            data={sectionedData.systemItems}
            showLocation={showLocation}
            locationRootId={locationRootId}
            locationRootLabel={locationRootLabel}
            onFolderClick={onFolderClick}
            onFilePreview={onFilePreview}
            onFolderExport={onFolderExport}
            canExport={canExport}
            onPinPrimeContract={onPinPrimeContract}
            canPinPrimeContract={canPinPrimeContract}
            onSetPrimeContractPrimary={onSetPrimeContractPrimary}
            canSetPrimeContractPrimary={canSetPrimeContractPrimary}
          />
        </>
      )}
      {sectionedData.userItems.length > 0 && (
        <>
          <div className="min-w-0 border-y border-border bg-muted/50 px-3 py-2.5 sm:px-5">
            <FilesSectionHeader section="user" count={sectionedData.userItems.length} />
          </div>
          <FilesGridView
            data={sectionedData.userItems}
            showLocation={showLocation}
            locationRootId={locationRootId}
            locationRootLabel={locationRootLabel}
            onFolderClick={onFolderClick}
            onFilePreview={onFilePreview}
            onFolderExport={onFolderExport}
            canExport={canExport}
            onPinPrimeContract={onPinPrimeContract}
            canPinPrimeContract={canPinPrimeContract}
            onSetPrimeContractPrimary={onSetPrimeContractPrimary}
            canSetPrimeContractPrimary={canSetPrimeContractPrimary}
          />
        </>
      )}
    </div>
  );
}
