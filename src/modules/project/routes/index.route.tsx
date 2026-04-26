import { Navigate, Route, Routes } from 'react-router-dom';

import PrimeContracts from '@modules/project/pages/prime-contracts';
import ProjectContractOverview from '@modules/project/pages/project-contract-overview';
import InvoiceRoutes from '@modules/project/routes/invoice.route';
import PCORoutes from '@modules/project/routes/pco.route';
import PORoutes from '@modules/project/routes/po.route';
import RFQRoutes from '@modules/project/routes/rfq.route';
import SCORoutes from '@modules/project/routes/sco.route';

import ProjectEditForm from '../pages/project-edit-form';

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="edit" element={<ProjectEditForm />} />
      <Route path="overview" element={<ProjectContractOverview />} />
      <Route path="prime-contracts" element={<PrimeContracts />} />
      <Route path="prime-change-orders/*" element={<PCORoutes />} />
      <Route path="rfqs/*" element={<RFQRoutes />} />
      <Route path="invoices/*" element={<InvoiceRoutes />} />
      <Route path="sub-change-order/*" element={<SCORoutes />} />
      <Route path="/purchase-orders/*" element={<PORoutes />} />
    </Routes>
  );
};

export default ProjectRoutes;
