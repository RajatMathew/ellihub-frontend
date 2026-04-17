import { useQuery } from '@tanstack/react-query';

import { filesApi } from '@modules/files/api/files.api';
import { filesKeys } from '@modules/files/constants/files.keys';

/**
 * Traverses the file system to find a project's subfolder:
 *   root → "projects" → {projectId} → {subfolderName}
 *
 * If `subfolderName` is omitted, returns the project root folder ID.
 */
async function resolveProjectFolder(
  projectId: string,
  subfolderName?: string,
): Promise<string> {
  // 1. Get root folder
  const root = await filesApi.getRootFolder();

  // 2. Find "projects" folder in root children
  const rootDetail = await filesApi.getFolderDetails(root.id);
  const projectsFolder = rootDetail.children.find(
    (c) => c.type === 'FOLDER' && (c.name || '').toLowerCase() === 'projects',
  );
  if (!projectsFolder) throw new Error('Projects folder not found');

  // 3. Find the project folder by projectId
  const projectsFolderDetail = await filesApi.getFolderDetails(projectsFolder.id);
  const projectFolder = projectsFolderDetail.children.find(
    (c) => c.type === 'FOLDER' && c.name === projectId,
  );
  if (!projectFolder) throw new Error(`Project folder not found for ${projectId}`);

  if (!subfolderName) return projectFolder.id;

  // 4. Find the named subfolder
  const projectFolderDetail = await filesApi.getFolderDetails(projectFolder.id);
  const subfolder = projectFolderDetail.children.find(
    (c) => c.type === 'FOLDER' && (c.name || '').toLowerCase() === subfolderName.toLowerCase(),
  );
  if (!subfolder) throw new Error(`Subfolder "${subfolderName}" not found`);

  return subfolder.id;
}

export function useProjectFolderQuery(projectId: string | undefined, subfolderName?: string) {
  return useQuery({
    queryKey: [...filesKeys.all, 'projectFolder', projectId, subfolderName ?? '__root__'],
    queryFn: () => resolveProjectFolder(projectId!, subfolderName),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
