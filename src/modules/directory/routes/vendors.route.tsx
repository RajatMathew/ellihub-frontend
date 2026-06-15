import { NotFound } from '@/app/components/error/not-found';
import { VendorDetailPage, VendorFormPage, VendorListPage } from '@/modules/directory/pages';
import { Route, Routes } from 'react-router-dom';

const VendorRoutes = () => {
  return (
    <Routes>
      <Route index element={<VendorListPage />} />
      <Route path="create" element={<VendorFormPage />} />
      <Route path=":id" element={<VendorDetailPage />} />
      <Route path=":id/edit" element={<VendorFormPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default VendorRoutes;
