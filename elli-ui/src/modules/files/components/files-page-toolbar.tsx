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
import { Download, FolderPlus, FolderSearch, Globe2, Search, Upload } from 'lucide-react';

interface FilesPageToolbarProps {
  title?: string;
  searchInput: string;
  searchMode: FilesSearchMode;
  canMutateFolder: boolean;
  canExport: boolean;
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
  canMutateFolder,
  canExport,
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
        <ToolbarHeading>
          <ToolbarPageTitle>{title}</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarActions className="w-full sm:w-auto">
          <div
            className="relative w-full sm:w-80"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={handleSearchBlur}
          >
            <InputWrapper className="w-full" variant="sm">
              <Search className="size-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputWrapper>
            {showSearchMode && (
              <div className="absolute left-0 top-full z-20 mt-1 rounded-md border bg-background p-1 shadow-sm">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={searchMode}
                  aria-label="Search scope"
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
          <Button variant="outline" size="sm" onClick={onExport} disabled={!canExport}>
            <Download className="size-4" />
            Export ZIP
          </Button>
          {showMutationActions && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateFolder}
                disabled={!canMutateFolder}
              >
                <FolderPlus className="size-4" />
                New Folder
              </Button>
              <Button size="sm" onClick={onUploadFile} disabled={!canMutateFolder}>
                <Upload className="size-4" />
                Upload
              </Button>
            </>
          )}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
