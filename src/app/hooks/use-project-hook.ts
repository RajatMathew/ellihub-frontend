import { useLocation, useNavigate, useParams } from 'react-router-dom';

export function useProjectNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ projectId: string }>();

  // Decode projectId for internal usage
  const projectId = params.projectId ? decodeURIComponent(params.projectId) : undefined;

  const changeProject = (id: string, options?: { replace?: boolean }) => {
    if (!params.projectId) return;

    const encodedCurrentId = params.projectId;
    const encodedNextId = encodeURIComponent(id);

    const newPath = location.pathname.replace(
      `/project/${encodedCurrentId}`,
      `/project/${encodedNextId}`
    );
    const searchParams = new URLSearchParams(location.search);

    if (newPath.includes('/files')) {
      searchParams.delete('folderId');
      searchParams.delete('folderPath');
      searchParams.delete('page');
    }

    const nextSearch = searchParams.toString();

    navigate(`${newPath}${nextSearch ? `?${nextSearch}` : ''}`, {
      replace: options?.replace ?? false,
      state: location.state,
    });
  };

  return {
    projectId, // decoded, safe to use everywhere
    changeProject,
  };
}
