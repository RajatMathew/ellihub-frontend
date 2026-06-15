import { NotFound } from '@/app/components/error/not-found';
import { RFQDetailPage, RFQFormPage, RFQListPage } from '@/modules/project/pages/rfq';
import { Route, Routes } from 'react-router-dom';

const RFQRoutes = () => {
  return (
    <Routes>
      <Route index element={<RFQListPage />} />
      <Route path="create" element={<RFQFormPage />} />
      <Route path=":rfqId" element={<RFQDetailPage />} />
      <Route path=":rfqId/edit" element={<RFQFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RFQRoutes;
