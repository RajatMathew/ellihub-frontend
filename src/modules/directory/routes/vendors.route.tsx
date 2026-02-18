import { Route, Routes } from 'react-router-dom';

import { VendorDetailPage, VendorFormPage, VendorListPage } from '../pages';

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
