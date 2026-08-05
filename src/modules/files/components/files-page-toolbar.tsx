import { useState, type FocusEvent } from 'react';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';
import type { FilesSearchMode } from '@/modules/files/hooks/use-files-list-params';
import { Download, FolderPlus, FolderSearch, Globe2, Loader2, Search, Upload } from 'lucide-react';

interface FilesPageToolbarProps {
  title?: string;
  searchInput: string;
  searchMode: FilesSearchMode;
  canCreateFolder: boolean;
  canUpload: boolean;
  canExport: boolean;
  isExporting?: boolean;
  showMutationActions?: boolean;
  onSearchChange: (value: string) => void;
  onSearchModeChange: (value: FilesSearchMode) => void;
  onExport: () => void;
  onCreateFolder: () => void;
  onUploadFile: () => void;
}

export function FilesPageToolbar({
  title = 'Files',
  searchInput,
  searchMode,
  canCreateFolder,
  canUpload,
  canExport,
  isExporting = false,
  showMutationActions = true,
  onSearchChange,
  onSearchModeChange,
  onExport,
  onCreateFolder,
  onUploadFile,
}: FilesPageToolbarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const showSearchMode = isSearchFocused || searchInput.trim().length > 0;
  const searchPlaceholder =
    searchMode === 'folder' ? 'Search this folder...' : 'Search all files...';

  const handleSearchBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setIsSearchFocused(false);
  };

  return (
    <Toolbar>
      <ToolbarWrapper>
        <ToolbarHeading className="min-w-0 flex-1">
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions className="w-full min-w-0 items-stretch sm:w-auto sm:items-center sm:justify-end">
          <div
            className="relative w-full min-w-0 sm:w-72 lg:w-80"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={handleSearchBlur}
          >
            <InputWrapper className="w-full min-w-0" variant="sm">
              <Search className="size-4" />
              <Input
                className="min-w-0"
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputWrapper>
            {showSearchMode && (
              <div className="absolute left-0 top-full z-20 mt-1 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border bg-background p-1 shadow-sm">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={searchMode}
                  aria-label="Search scope"
                  className="max-w-full"
                  onValueChange={(value) => {
                    if (value === 'global' || value === 'folder') {
                      onSearchModeChange(value);
                    }
                  }}
                >
                  <ToggleGroupItem
                    value="global"
                    aria-label="Global search"
                    className="h-7 gap-1.5 text-xs"
                  >
                    <Globe2 className="size-3.5" />
                    Global
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="folder"
                    aria-label="Folder search"
                    className="h-7 gap-1.5 text-xs"
                  >
                    <FolderSearch className="size-3.5" />
                    Folder
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={onExport}
            disabled={!canExport}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {isExporting ? 'View Export' : 'Export ZIP'}
          </Button>
          {showMutationActions && canCreateFolder && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={onCreateFolder}
            >
              <FolderPlus className="size-4" />
              New Folder
            </Button>
          )}
          {showMutationActions && canUpload && (
            <Button size="sm" className="w-full sm:w-auto" onClick={onUploadFile}>
              <Upload className="size-4" />
              Upload
            </Button>
          )}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
