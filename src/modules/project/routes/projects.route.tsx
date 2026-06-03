import { PermissionRoute } from '@/app/components/access/permission-route';
import { NotFound } from '@/app/components/error/not-found';
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ProjectRoutes;
