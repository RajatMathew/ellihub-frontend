import {
  filesApi,
  type EntitySubFolderType,
  type FolderRegistry,
  type ProjectEntityFolderType,
} from '@/modules/files/api/files.api';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

/**
 * A folder name to the protected folder type it means.
 *
 * Built from what the API declares rather than from a table kept here. The two
 * used to drift, and when they did a lookup either opened the wrong folder or
 * fell back to matching children by name.
 */
function buildNameIndex(registry: FolderRegistry): Map<string, string> {
  const index = new Map<string, string>();

  for (const folder of registry.projectFolders) {
    index.set(folder.name.trim().toLowerCase(), folder.type);
    index.set(folder.displayName.trim().toLowerCase(), folder.type);
  }

  return index;
}

/**
 * The registry goes through the query cache like any other server data, so
 * concurrent folder lookups share one request and a failure is not remembered.
 * The folder list only changes when the API deploys, hence the long staleTime.
 */
function loadRegistry(queryClient: QueryClient): Promise<FolderRegistry> {
  return queryClient.fetchQuery({
    queryKey: filesKeys.registry(),
    queryFn: () => filesApi.getFolderRegistry(),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Resolves a project's file folder through the project-specific file API.
 * If `subfolderName` is omitted, returns the project root folder ID.
 */
async function resolveProjectFolder(
  queryClient: QueryClient,
  projectId: string,
  subfolderName?: string
): Promise<string> {
  const projectFolderId = await filesApi.getProjectFolderId(projectId);

  if (!subfolderName) return projectFolderId;

  const protectedType = buildNameIndex(await loadRegistry(queryClient)).get(
    subfolderName.trim().toLowerCase()
  );
  if (protectedType) {
    return filesApi.getProjectSubFolderId(projectId, protectedType);
  }

  // Not a protected area: an ordinary folder somebody made inside the project.
  const projectFolderDetail = await filesApi.getFolderDetails(projectFolderId);
  const subfolder = projectFolderDetail.children.find(
    (c) => c.type === 'FOLDER' && (c.name || '').toLowerCase() === subfolderName.toLowerCase()
  );
  if (!subfolder) throw new Error(`Subfolder "${subfolderName}" not found`);

  return subfolder.id;
}

export async function resolveProjectEntityFolder(
  projectId: string,
  entityType: ProjectEntityFolderType,
  entityId: string,
  subFolder?: EntitySubFolderType
): Promise<string> {
  return filesApi.getProjectEntityFolderId(projectId, entityType, entityId, subFolder);
}

export function useProjectFolderQuery(projectId: string | undefined, subfolderName?: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...filesKeys.all, 'projectFolder', projectId, subfolderName ?? '__root__'],
    queryFn: () => resolveProjectFolder(queryClient, projectId!, subfolderName),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useProjectEntityFolderQuery(
  projectId: string | undefined,
  entityType: ProjectEntityFolderType | undefined,
  entityId: string | undefined,
  enabled = true,
  subFolder?: EntitySubFolderType
) {
  return useQuery({
    queryKey: [
      ...filesKeys.all,
      'projectEntityFolder',
      projectId,
      entityType ?? '__type__',
      entityId ?? '__entity__',
      subFolder ?? '__self__',
    ],
    queryFn: () => resolveProjectEntityFolder(projectId!, entityType!, entityId!, subFolder),
    enabled: enabled && !!projectId && !!entityType && !!entityId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
