export const filesKeys = {
  all: ['files'] as const,
  root: () => [...filesKeys.all, 'root'] as const,
  registry: () => [...filesKeys.all, 'registry'] as const,
  folderDetail: (id: string) => [...filesKeys.all, 'folder', id] as const,
  search: (params: unknown) => [...filesKeys.all, 'search', params] as const,
  preview: (id: string) => [...filesKeys.all, 'preview', id] as const,
  /** A project's folder, or a named folder inside it. One entry per pair. */
  projectFolder: (projectId: string | undefined, subfolderName?: string) =>
    [...filesKeys.all, 'projectFolder', projectId, subfolderName ?? '__root__'] as const,
};
