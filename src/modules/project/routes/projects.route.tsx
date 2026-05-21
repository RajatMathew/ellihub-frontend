import { AdminRoute } from '@/app/components/access/admin-route';
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
          <AdminRoute>
            <ProjectForm />
          </AdminRoute>
        }
      />
    </Routes>
  );
};

export default ProjectRoutes;
