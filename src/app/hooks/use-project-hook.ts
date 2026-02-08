import { useNavigate, useParams, useLocation } from "react-router-dom";

export function useProjectNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ projectId: string }>();

  // Decode projectId for internal usage
  const projectId = params.projectId
    ? decodeURIComponent(params.projectId)
    : undefined;

  const changeProject = (id: string, options?: { replace?: boolean }) => {
    if (!params.projectId) return;

    const encodedCurrentId = params.projectId;
    const encodedNextId = encodeURIComponent(id);

    const newPath = location.pathname.replace(
      `/project/${encodedCurrentId}`,
      `/project/${encodedNextId}`,
    );

    navigate(newPath + location.search, {
      replace: options?.replace ?? false,
      state: location.state,
    });
  };

  return {
    projectId, // decoded, safe to use everywhere
    changeProject,
  };
}
