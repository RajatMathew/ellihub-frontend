import { Route, Routes } from 'react-router-dom';

import ProjectForm from '@modules/project/pages/project-form';
import ProjectList from '@modules/project/pages/project-list';

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route path="new" element={<ProjectForm />} />
    </Routes>
  );
};

export default ProjectRoutes;
