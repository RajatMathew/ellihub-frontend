import { QueryErrorState } from '@/app/components/query-error-state';
import { FilesExplorer } from '@/modules/files/components/files-explorer';
import { ProjectOverviewLoading } from '@/modules/project/components/overview';
import {
  useContractAttachmentsQuery,
  usePinPrimeContractsMutation,
  useSetPrimeContractPrimaryMutation,
} from '@/modules/project/hooks/contract-attachment.hooks';
import { useProjectDetailQuery, useProjectFolderQuery } from '@/modules/project/hooks';
import { useParams } from 'react-router-dom';

export default function ProjectFilesPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const projectQuery = useProjectDetailQuery(projectId);
  const folderQuery = useProjectFolderQuery(projectId || undefined);
  const primeContractFolderQuery = useProjectFolderQuery(projectId || undefined, 'prime contract');
  const { data: pinnedPrimeContracts = [] } = useContractAttachmentsQuery(projectId);
  const pinPrimeContractsMutation = usePinPrimeContractsMutation();
  const setPrimeContractPrimaryMutation = useSetPrimeContractPrimaryMutation();

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
      readOnly={!(projectQuery.data?.capabilities?.canManage ?? false)}
      primeContractPinning={{
        folderId: primeContractFolderQuery.data,
        pinnedFileIds: pinnedPrimeContracts
          .map((contract) => contract.fileId ?? contract.file?.id ?? contract.documentId)
          .filter((id): id is string => Boolean(id)),
        canPin: projectQuery.data?.capabilities?.actions?.primeContract?.pin === true,
        onPin: (file) =>
          pinPrimeContractsMutation.mutate({
            projectId,
            fileIds: [file.id],
          }),
        canSetPrimary: projectQuery.data?.capabilities?.actions?.primeContract?.primary === true,
        onSetPrimary: (file, isPrimary) => {
          if (!file.primeContract?.id) return;
          setPrimeContractPrimaryMutation.mutate({
            projectId,
            primeContractIds: [file.primeContract.id],
            isPrimary,
          });
        },
      }}
    />
  );
}
