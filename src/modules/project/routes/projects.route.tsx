import { Route, Routes } from 'react-router-dom';

import { POFormPage } from '@modules/project/pages/po-form';
import PrimeContracts from '@modules/project/pages/prime-contracts';
import ProjectContractOverview from '@modules/project/pages/project-contract-overview';
import ProjectForm from '@modules/project/pages/project-form';
import ProjectList from '@modules/project/pages/project-list';
import ProjectPOs from '@modules/project/pages/purchase-orders';
import InvoiceRoutes from '@modules/project/routes/invoice.route';
import PCORoutes from '@modules/project/routes/pco.route';
import RFQRoutes from '@modules/project/routes/rfq.route';
import { PODetailPage } from '@modules/purchase-orders/pages/po-detail';

import ProjectEditForm from '../pages/project-edit-form';

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route path="new" element={<ProjectForm />} />
      <Route path=":projectId/overview" element={<ProjectContractOverview />} />
      <Route path=":projectId/edit" element={<ProjectEditForm />} />
      <Route path=":projectId/prime-contracts" element={<PrimeContracts />} />
      <Route path=":projectId/prime-change-orders/*" element={<PCORoutes />} />
      <Route path=":projectId/rfqs/*" element={<RFQRoutes />} />
      <Route path=":projectId/invoices/*" element={<InvoiceRoutes />} />
      <Route path=":projectId/purchase-orders" element={<ProjectPOs />} />
      <Route path=":projectId/purchase-orders/create" element={<POFormPage />} />
      <Route path=":projectId/purchase-orders/:poId" element={<PODetailPage />} />
    </Routes>
  );
};

export default ProjectRoutes;
