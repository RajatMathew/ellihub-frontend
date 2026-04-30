import { Navigate, Route, Routes } from 'react-router-dom';

import { PrimeChangeOrderListPage } from '@modules/project/pages/prime-change-order-list';

const PrimeChangeOrderRoutes = () => {
  return (
    <Routes>
      <Route index element={<PrimeChangeOrderListPage />} />
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
};

export default PrimeChangeOrderRoutes;
