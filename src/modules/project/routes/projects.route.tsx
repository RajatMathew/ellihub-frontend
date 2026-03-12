import { Navigate, Route, Routes } from 'react-router-dom';

import PrimeContracts from '@modules/project/pages/prime-contracts';
import ProjectContractOverview from '@modules/project/pages/project-contract-overview';
import ProjectForm from '@modules/project/pages/project-form';
import ProjectList from '@modules/project/pages/project-list';
import PCORoutes from '@modules/project/routes/pco.route';
import PORoutes from '@modules/project/routes/po.route';
import RFQRoutes from '@modules/project/routes/rfq.route';
import InvoiceRoutes from '@modules/project/routes/invoice.route';
import SCORoutes from '@modules/project/routes/sco.route';

import ProjectEditForm from '../pages/project-edit-form';

function ProjectIndexRedirect() {
  return <Navigate to="overview" replace />;
}

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route path="new" element={<ProjectForm />} />
      <Route path=":projectId" element={<ProjectIndexRedirect />} />
      <Route path=":projectId/edit" element={<ProjectEditForm />} />
      <Route path=":projectId/overview" element={<ProjectContractOverview />} />
      <Route path=":projectId/prime-contracts" element={<PrimeContracts />} />
      <Route path=":projectId/prime-change-orders/*" element={<PCORoutes />} />
      <Route path=":projectId/rfqs/*" element={<RFQRoutes />} />
      <Route path=":projectId/invoices/*" element={<InvoiceRoutes />} />
      <Route path=":projectId/vendors/change-orders/*" element={<SCORoutes />} />
      <Route path=":projectId/purchase-orders/*" element={<PORoutes />} />
    </Routes>
  );
};

export default ProjectRoutes;
