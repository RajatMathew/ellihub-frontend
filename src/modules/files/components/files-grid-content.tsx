import type { SectionedFiles } from '@/modules/files/hooks/use-files-display-data';
import type { FileItem } from '@/modules/files/schemas/file.schema';

import { FilesEmptyState } from './files-empty-state';
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
  onPinPrimeContract,
  canPinPrimeContract,
  onSetPrimeContractPrimary,
  canSetPrimeContractPrimary,
}: FilesGridContentProps) {
  if (isLoading) return <FilesGridLoading />;

  if (sectionedData.data.length === 0) return <FilesEmptyState />;

  return (
    <div>
      {sectionedData.protectedItems.length > 0 && (
        <>
          <div className="border-y border-border bg-muted/50 px-5 py-2.5">
            <FilesSectionHeader type="protected" count={sectionedData.protectedItems.length} />
          </div>
          <FilesGridView
            data={sectionedData.protectedItems}
            showLocation={showLocation}
            locationRootId={locationRootId}
            locationRootLabel={locationRootLabel}
            onFolderClick={onFolderClick}
            onFilePreview={onFilePreview}
            onFolderExport={onFolderExport}
            onPinPrimeContract={onPinPrimeContract}
            canPinPrimeContract={canPinPrimeContract}
            onSetPrimeContractPrimary={onSetPrimeContractPrimary}
            canSetPrimeContractPrimary={canSetPrimeContractPrimary}
          />
        </>
      )}
      {sectionedData.sharedItems.length > 0 && (
        <>
          <div className="border-y border-border bg-muted/50 px-5 py-2.5">
            <FilesSectionHeader type="shared" count={sectionedData.sharedItems.length} />
          </div>
          <FilesGridView
            data={sectionedData.sharedItems}
            showLocation={showLocation}
            locationRootId={locationRootId}
            locationRootLabel={locationRootLabel}
            onFolderClick={onFolderClick}
            onFilePreview={onFilePreview}
            onFolderExport={onFolderExport}
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
