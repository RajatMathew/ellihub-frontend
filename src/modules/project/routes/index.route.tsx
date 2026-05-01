import { Navigate, Route, Routes } from 'react-router-dom';

import ProjectContractOverview from '@/modules/project/pages/project-contract-overview';
import InvoiceRoutes from '@/modules/project/routes/invoice/index.route';
import PORoutes from '@/modules/project/routes/purchase-order/index.route';
import PrimeChangeOrderRoutes from '@/modules/project/routes/prime-change-order/index.route';
import RFQRoutes from '@/modules/project/routes/rfq/index.route';
import SCORoutes from '@/modules/project/routes/sub-change-order/index.route';

import ProjectEditForm from '../pages/project-edit-form';

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="edit" element={<ProjectEditForm />} />
      <Route path="overview" element={<ProjectContractOverview />} />
      <Route path="prime-change-orders/*" element={<PrimeChangeOrderRoutes />} />
      <Route path="rfqs/*" element={<RFQRoutes />} />
      <Route path="invoices/*" element={<InvoiceRoutes />} />
      <Route path="sub-change-order/*" element={<SCORoutes />} />
      <Route path="purchase-orders/*" element={<PORoutes />} />
    </Routes>
  );
};

export default ProjectRoutes;
