import { NotFound } from '@/app/components/error/not-found';
import { PrimeChangeOrderListPage } from '@/modules/project/pages/prime-change-order';
import { Route, Routes } from 'react-router-dom';

const PrimeChangeOrderRoutes = () => {
  return (
    <Routes>
      <Route index element={<PrimeChangeOrderListPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default PrimeChangeOrderRoutes;
