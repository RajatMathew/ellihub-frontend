import { NotFound } from '@/app/components/error/not-found';
import ProjectContractOverview from '@/modules/project/pages/project-contract-overview';
import ProjectFilesPage from '@/modules/project/pages/project-files';
import ProjectForm from '@/modules/project/pages/project-form';
import InvoiceRoutes from '@/modules/project/routes/invoice/index.route';
import PrimeChangeOrderRoutes from '@/modules/project/routes/prime-change-order/index.route';
import PORoutes from '@/modules/project/routes/purchase-order/index.route';
import RFQRoutes from '@/modules/project/routes/rfq/index.route';
import SCORoutes from '@/modules/project/routes/sub-change-order/index.route';
import { Navigate, Route, Routes } from 'react-router-dom';

const ProjectRoutes = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="edit" element={<ProjectForm />} />
      <Route path="overview" element={<ProjectContractOverview />} />
      <Route path="files" element={<ProjectFilesPage />} />
      <Route path="prime-change-orders/*" element={<PrimeChangeOrderRoutes />} />
      <Route path="rfqs/*" element={<RFQRoutes />} />
      <Route path="invoices/*" element={<InvoiceRoutes />} />
      <Route path="sub-change-order/*" element={<SCORoutes />} />
      <Route path="purchase-orders/*" element={<PORoutes />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ProjectRoutes;
