import { QueryErrorState } from '@/app/components/query-error-state';
import { FilesExplorer } from '@/modules/files/components/files-explorer';
import { ProjectOverviewLoading } from '@/modules/project/components/overview';
import { useProjectDetailQuery, useProjectFolderQuery } from '@/modules/project/hooks';
import { useParams } from 'react-router-dom';

export default function ProjectFilesPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const projectQuery = useProjectDetailQuery(projectId);
  const folderQuery = useProjectFolderQuery(projectId || undefined);

  if (projectQuery.isLoading || folderQuery.isLoading) {
    return <ProjectOverviewLoading />;
  }

  if (projectQuery.isError || folderQuery.isError || !folderQuery.data) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Failed to load project files"
          onRetry={() => {
            void projectQuery.refetch();
            void folderQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <FilesExplorer
      title="Project Files"
      rootFolderId={folderQuery.data}
      rootLabel={projectQuery.data?.name ?? 'Project'}
    />
  );
}
