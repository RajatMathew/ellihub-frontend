import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Download, FolderPlus, Search, Upload } from 'lucide-react';

interface FilesPageToolbarProps {
  title?: string;
  searchInput: string;
  canMutateFolder: boolean;
  canExport: boolean;
  onSearchChange: (value: string) => void;
  onExport: () => void;
  onCreateFolder: () => void;
  onUploadFile: () => void;
}

export function FilesPageToolbar({
  title = 'Files',
  searchInput,
  canMutateFolder,
  canExport,
  onSearchChange,
  onExport,
  onCreateFolder,
  onUploadFile,
}: FilesPageToolbarProps) {
  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading>
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions className="w-full sm:w-auto">
          <InputWrapper className="w-full sm:w-72" variant="sm">
            <Search className="size-4" />
            <Input
              placeholder="Search files..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputWrapper>
          <Button variant="outline" size="sm" onClick={onExport} disabled={!canExport}>
            <Download className="size-4" />
            Export ZIP
          </Button>
          <Button variant="outline" size="sm" onClick={onCreateFolder} disabled={!canMutateFolder}>
            <FolderPlus className="size-4" />
            New Folder
          </Button>
          <Button size="sm" onClick={onUploadFile} disabled={!canMutateFolder}>
            <Upload className="size-4" />
            Upload
          </Button>
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
