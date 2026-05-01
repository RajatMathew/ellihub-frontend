import { VendorDetailPage, VendorFormPage, VendorListPage } from '@/modules/directory/pages';
import { Route, Routes } from 'react-router-dom';

const VendorRoutes = () => {
  return (
    <Routes>
      <Route index element={<VendorListPage />} />
      <Route path="create" element={<VendorFormPage />} />
      <Route path=":id" element={<VendorDetailPage />} />
      <Route path=":id/edit" element={<VendorFormPage />} />
    </Routes>
  );
};

export default VendorRoutes;
