import {
  filesApi,
  type ProjectEntityFolderType,
  type ProjectProtectedFolderType,
} from '@/modules/files/api/files.api';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { useQuery } from '@tanstack/react-query';

const PROJECT_SUBFOLDER_TYPES: Record<string, ProjectProtectedFolderType> = {
  invoice: 'INVOICE',
  rfq: 'RFQ',
  'purchase order': 'PURCHASE_ORDER',
  'purchase order co': 'PURCHASE_ORDER_CO',
  'prime co': 'PRIME_CO',
  'sub change order': 'SUB_CHANGE_ORDER',
  sco: 'SUB_CHANGE_ORDER',
  'prime contract': 'PRIME_CONTRACT',
  schedule: 'SCHEDULE',
};

/**
 * Resolves a project's file folder through the project-specific file API.
 * If `subfolderName` is omitted, returns the project root folder ID.
 */
async function resolveProjectFolder(projectId: string, subfolderName?: string): Promise<string> {
  const projectFolderId = await filesApi.getProjectFolderId(projectId);

  if (!subfolderName) return projectFolderId;

  const protectedType = PROJECT_SUBFOLDER_TYPES[subfolderName.trim().toLowerCase()];
  if (protectedType) {
    return filesApi.getProjectSubFolderId(projectId, protectedType);
  }

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
  entityId: string
): Promise<string> {
  return filesApi.getProjectEntityFolderId(projectId, entityType, entityId);
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

export function useProjectEntityFolderQuery(
  projectId: string | undefined,
  entityType: ProjectEntityFolderType | undefined,
  entityId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: [
      ...filesKeys.all,
      'projectEntityFolder',
      projectId,
      entityType ?? '__type__',
      entityId ?? '__entity__',
    ],
    queryFn: () => resolveProjectEntityFolder(projectId!, entityType!, entityId!),
    enabled: enabled && !!projectId && !!entityType && !!entityId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
