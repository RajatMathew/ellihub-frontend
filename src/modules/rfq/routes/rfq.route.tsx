import { Route, Routes } from 'react-router-dom';

import { RfqDetailPage, RfqsPage } from '../pages';

const RfqRoutes = () => (
  <Routes>
    <Route index element={<RfqsPage />} />
    <Route path=":rfqNumber" element={<RfqDetailPage />} />
  </Routes>
);

export default RfqRoutes;
