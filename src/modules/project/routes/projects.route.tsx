import { Route, Routes } from 'react-router-dom';

import ProjectForm from '@modules/project/pages/project-form';
import ProjectList from '@modules/project/pages/project-list';
import PrimeContracts from '@modules/project/pages/prime-contracts';
import ProjectContractOverview from '@modules/project/pages/project-contract-overview';
import PCORoutes from '@modules/project/routes/pco.route';

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route path="new" element={<ProjectForm />} />
      <Route path=":projectId/overview" element={<ProjectContractOverview />} />
      <Route path=":projectId/prime-contracts" element={<PrimeContracts />} />
      <Route path=":projectId/prime-change-orders/*" element={<PCORoutes />} />
    </Routes>
  );
};

export default ProjectRoutes;
