import { Navigate, Route, Routes } from 'react-router-dom';

import QuickBooksIntegrationPage from '@/modules/integrations/pages/quickbooks-integration-page';

export default function IntegrationsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="quickbooks" replace />} />
      <Route path="quickbooks" element={<QuickBooksIntegrationPage />} />
    </Routes>
  );
}
