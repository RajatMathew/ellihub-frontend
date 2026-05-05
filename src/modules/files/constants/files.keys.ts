export const filesKeys = {
  all: ['files'] as const,
  root: () => [...filesKeys.all, 'root'] as const,
  folderDetail: (id: string) => [...filesKeys.all, 'folder', id] as const,
  search: (params: unknown) => [...filesKeys.all, 'search', params] as const,
  preview: (id: string) => [...filesKeys.all, 'preview', id] as const,
};
