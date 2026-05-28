import { PermissionRoute } from '@/app/components/access/permission-route';
import ProjectForm from '@/modules/project/pages/project-form';
import ProjectList from '@/modules/project/pages/project-list';
import { Route, Routes } from 'react-router-dom';

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route
        path="new"
        element={
          <PermissionRoute resource="project" action="create">
            <ProjectForm />
          </PermissionRoute>
        }
      />
    </Routes>
  );
};

export default ProjectRoutes;
